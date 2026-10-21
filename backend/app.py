from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import secrets
import time
import hashlib
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / 'frontend'
DB_PATH = Path('/app/data/cards.db')
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=None)

@app.get('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/')
def home():
    return send_from_directory('frontend', 'index.html')

def db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = db()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        folder_id INTEGER,
        title TEXT NOT NULL,
        card_holder TEXT NOT NULL,
        card_number TEXT NOT NULL,
        expiry TEXT,
        cvv TEXT,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS password_resets(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
    );
    ''')
    c.commit()
    c.close()
    
@app.get('/<path:path>')
def static(path):
    p = FRONTEND_DIR / path
    if p.is_file():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.post('/api/register')
def register():
    d = request.get_json() or {}
    name = d.get('name', '').strip()
    email = d.get('email', '').strip().lower()
    password = d.get('password', '')

    if not name or not email or not password:
        return jsonify(error='Name, email and password are required.'), 400

    if len(password) < 6:
        return jsonify(error='Password must be at least 6 characters.'), 400

    c = db()
    try:
        cur = c.execute(
            'INSERT INTO users(name,email,password) VALUES(?,?,?)',
            (name, email, generate_password_hash(password))
        )
        c.commit()
        uid = cur.lastrowid
    except sqlite3.IntegrityError:
        return jsonify(error='Email is already registered.'), 409
    finally:
        c.close()

    return jsonify(
        message='Registration successful.',
        user={'id': uid, 'name': name, 'email': email}
    ), 201


@app.post('/api/forgot-password')
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify(error='Email is required.'), 400

    c = db()
    try:
        user = c.execute(
            'SELECT id FROM users WHERE email=?',
            (email,)
        ).fetchone()

        # Do not reveal whether an email is registered.
        if not user:
            return jsonify(
                message='If the account exists, reset instructions will be sent.'
            ), 200

        c.execute(
            'DELETE FROM password_resets WHERE user_id=?',
            (user['id'],)
        )

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = int(time.time()) + 900  # 15 minutes

        c.execute(
            '''INSERT INTO password_resets
               (user_id, token_hash, expires_at)
               VALUES (?, ?, ?)''',
            (user['id'], token_hash, expires_at)
        )
        c.commit()

        # Email delivery is not configured yet.
        # Never expose the reset token through this public API.
        reset_link = f"http://localhost:5040/reset-password.html?token={token}"
        app.logger.warning("DEV ONLY - Password reset link: %s", reset_link)
        return jsonify(
            message='Reset link generated successfully.',
            reset_link=reset_link), 200
    finally:
        c.close()
# Reset password API
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}

    token = data.get('token', '').strip()
    new_password = data.get('password', '')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required.'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must contain at least 6 characters.'}), 400

    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    now = int(time.time())

    conn = db()
    try:
        reset = conn.execute(
            '''SELECT id, user_id
               FROM password_resets
               WHERE token_hash = ?
                 AND used = 0
                 AND expires_at > ?''',
            (token_hash, now)
        ).fetchone()

        if reset is None:
            return jsonify({
                'error': 'Invalid or expired reset token. Please request a new one.'
            }), 400

        conn.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            (generate_password_hash(new_password), reset['user_id'])
        )

        conn.execute(
            'UPDATE password_resets SET used = 1 WHERE id = ?',
            (reset['id'],)
        )

        conn.commit()

        return jsonify({
            'message': 'Password reset successful. Please log in with your new password.'
        }), 200

    except sqlite3.Error:
        conn.rollback()
        app.logger.exception('Password reset failed')
        return jsonify({'error': 'Unable to reset password. Please try again.'}), 500

    finally:
        conn.close()

@app.post('/api/login')
def login():
    d = request.get_json() or {}
    c = db()
    try:
        u = c.execute(
            'SELECT * FROM users WHERE email=?',
            (d.get('email', '').strip().lower(),)
        ).fetchone()
    finally:
        c.close()

    if not u or not check_password_hash(u['password'], d.get('password', '')):
        return jsonify(error='Invalid email or password.'), 401

    return jsonify(
        message='Login successful.',
        user={'id': u['id'], 'name': u['name'], 'email': u['email']}
    )


@app.delete('/api/users/<int:uid>/folders/<int:fid>')
def delete_folder(uid, fid):
    c = db()
    try:
        count = c.execute(
            'SELECT COUNT(*) FROM cards WHERE folder_id=? AND user_id=?',
            (fid, uid)
        ).fetchone()[0]

        if count > 0:
            return jsonify(
                error='Folder contains cards. Delete or move the cards first.'
            ), 400

        cur = c.execute(
            'DELETE FROM folders WHERE id=? AND user_id=?',
            (fid, uid)
        )
        c.commit()

        if cur.rowcount:
            return jsonify(message='Folder deleted.')

        return jsonify(error='Folder not found.'), 404
    finally:
        c.close()


@app.get('/api/users/<int:uid>/folders')
def folders(uid):
    c = db()
    try:
        rows = c.execute(
            'SELECT id,name FROM folders WHERE user_id=? ORDER BY id DESC',
            (uid,)
        ).fetchall()
        return jsonify([dict(x) for x in rows])
    finally:
        c.close()


@app.post('/api/users/<int:uid>/folders')
def add_folder(uid):
    name = (request.get_json() or {}).get('name', '').strip()

    if not name:
        return jsonify(error='Folder name is required.'), 400

    c = db()
    try:
        cur = c.execute(
            'INSERT INTO folders(user_id,name) VALUES(?,?)',
            (uid, name)
        )
        c.commit()
        return jsonify(id=cur.lastrowid, name=name), 201
    finally:
        c.close()


@app.get('/api/users/<int:uid>/cards')
def cards(uid):
    c = db()
    try:
        rows = c.execute('''
            SELECT cards.*,
                   COALESCE(folders.name, 'Unfiled') AS folder_name
            FROM cards
            LEFT JOIN folders ON folders.id = cards.folder_id
            WHERE cards.user_id=?
            ORDER BY cards.id DESC
        ''', (uid,)).fetchall()
        return jsonify([dict(x) for x in rows])
    finally:
        c.close()


@app.post('/api/users/<int:uid>/cards')
def add_card(uid):
    d = request.get_json() or {}
    title = d.get('title', '').strip()
    holder = d.get('card_holder', '').strip()
    number = d.get('card_number', '').strip()

    if not title or not holder or not number:
        return jsonify(
            error='Card title, card holder and card number are required.'
        ), 400

    c = db()
    try:
        cur = c.execute(
            '''INSERT INTO cards
               (user_id,folder_id,title,card_holder,card_number,expiry,cvv,notes)
               VALUES(?,?,?,?,?,?,?,?)''',
            (
                uid, d.get('folder_id') or None, title, holder, number,
                d.get('expiry', ''), d.get('cvv', ''), d.get('notes', '')
            )
        )
        c.commit()
        return jsonify(message='Card added.', id=cur.lastrowid), 201
    finally:
        c.close()


@app.delete('/api/users/<int:uid>/cards/<int:cid>')
def delete_card(uid, cid):
    c = db()
    try:
        cur = c.execute(
            'DELETE FROM cards WHERE id=? AND user_id=?',
            (cid, uid)
        )
        c.commit()

        if cur.rowcount:
            return jsonify(message='Card deleted.')

        return jsonify(error='Card not found.'), 404
    finally:
        c.close()


@app.get('/api/users/<int:uid>')
def profile(uid):
    c = db()
    try:
        u = c.execute(
            'SELECT id,name,email FROM users WHERE id=?',
            (uid,)
        ).fetchone()

        if u:
            return jsonify(dict(u))

        return jsonify(error='User not found.'), 404
    finally:
        c.close()


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5030, debug=True)
