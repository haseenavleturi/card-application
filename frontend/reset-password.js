const form = document.getElementById("resetPasswordForm");
const message = document.getElementById("message");
const tokenFromUrl = new URLSearchParams(window.location.search).get("token");

if (tokenFromUrl) {
    document.getElementById("token").value = tokenFromUrl;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = document.getElementById("token").value.trim();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
    }

    if (newPassword.length < 6) {
        message.textContent = "Password must contain at least 6 characters.";
        return;
    }

    try {
        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: token,
                password: newPassword
            })
        });

        const data = await response.json();
        message.textContent = data.message || data.error || "Request completed.";

        if (response.ok) {
            form.reset();
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        }
    } catch (error) {
        message.textContent = "Unable to connect to the server. Please try again.";
    }
});