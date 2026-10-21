const userId = localStorage.getItem("userId");
let userName = "CARD USER";
if (!userId) {
    window.location.href = "index.html";
}


// ==============================
// LOAD DASHBOARD / CARDS
// ==============================

async function loadDashboard() {
    try {
        const response = await fetch(`/api/users/${userId}/cards`);
        const cards = await response.json();

        if (!response.ok) {
            throw new Error(cards.error || "Failed to load cards");
        }

        // Total cards
        const totalCards = document.getElementById("totalCards");

        if (totalCards) {
            totalCards.textContent = cards.length;
        }

        // Unique folders
        // Total folders
const folderResponse =
    await fetch(`/api/users/${userId}/folders`);

const folderData =
    await folderResponse.json();

const totalFolders =
    document.getElementById("totalFolders");

if (totalFolders) {
    totalFolders.textContent =
        folderData.length;
}
        // Secure cards
        const secureCards = document.getElementById("secureCards");

        if (secureCards) {
            secureCards.textContent = cards.length;
        }

        const container = document.getElementById("cardsContainer");

        if (!container) {
            return;
        }

        if (cards.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    No cards found.
                </div>
            `;
            return;
        }

        container.innerHTML = cards.map(card => `
    <div class="bank-card">

        <div class="bank-card-top">
            <span>💳 CARD</span>
            <span class="card-type">VISA</span>
        </div>
<span class="bank-name">${card.title}</span>
        <div class="chip">▦</div>

        <div class="card-number">
            ${maskCardNumber(card.card_number)}
        </div>

        <div class="bank-card-bottom">

            <div>
                <small>CARD HOLDER</small>
               <strong>${card.card_holder || "CARD USER"}</strong>
            </div>

            <div>
                <small>EXPIRES</small>
                <strong>${card.expiry || "N/A"}</strong>
            </div>

        </div>

        <div class="card-folder">
            📁 ${card.folder_name || "Unfiled"}
        </div>

        <button
            onclick="deleteCard(${card.id})"
            class="delete-card-btn"
        >
            🗑️ Delete Card
        </button>

    </div>
`).join("");

    } catch (error) {

        console.error(error);

        const container = document.getElementById("cardsContainer");

        if (container) {
            container.innerHTML = `
                <div class="loading">
                    Unable to load cards.
                </div>
            `;
        }
    }
}


// ==============================
// MASK CARD NUMBER
// ==============================

function maskCardNumber(cardNumber) {

    if (!cardNumber) {
        return "**** **** **** ****";
    }

    const lastFour = cardNumber.slice(-4);

    return `**** **** **** ${lastFour}`;
}


// ==============================
// LOGOUT
// ==============================

function logout() {

    localStorage.removeItem("userId");

    window.location.href = "index.html";
}


// ==============================
// CREATE FOLDER
// ==============================

async function createFolder() {

    const folderInput =
        document.getElementById("folderName");

    if (!folderInput) {
        return;
    }

    const folderName =
        folderInput.value.trim();

    if (folderName === "") {
        alert("Please enter folder name.");
        return;
    }

    try {

        const response =
            await fetch(`/api/users/${userId}/folders`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: folderName
                })
            });

        const data =
            await response.json();

        if (!response.ok) {
            alert(
                data.error ||
                "Failed to create folder."
            );
            return;
        }

        alert("Folder created successfully.");

        folderInput.value = "";

        loadFolders();

    } catch (error) {

        console.error(error);

        alert("Unable to create folder.");
    }
}


// ==============================
// LOAD FOLDERS
// ==============================

async function loadFolders() {

    try {

        const response =
            await fetch(`/api/users/${userId}/folders`);

        const folders =
            await response.json();

        if (!response.ok) {
            throw new Error(
                folders.error ||
                "Failed to load folders"
            );
        }

        const container =
            document.getElementById("foldersContainer");

        const folderSelect =
            document.getElementById("cardFolder");


        // No folders
        if (folders.length === 0) {

            if (container) {

                container.innerHTML = `
                    <p>No folders created yet.</p>
                `;
            }

            if (folderSelect) {

                folderSelect.innerHTML = `
                    <option value="">
                        Select Folder
                    </option>
                `;
            }

            return;
        }


        // Display folders
        if (container) {

            container.innerHTML =
                folders.map(folder => `
                    <div
                        class="folder"
                        data-folder-id="${folder.id}"
                        data-folder-name="${folder.name}"
                        style="cursor:pointer;"
                    >
                        <span>
                            📁 ${folder.name}
                        </span>

                        <button
                            class="delete-folder-btn"
                            data-delete-folder-id="${folder.id}"
                            style="
                                margin-left:15px;
                                padding:6px 10px;
                                border:none;
                                border-radius:6px;
                                background:#dc2626;
                                color:white;
                                cursor:pointer;
                            "
                        >
                            🗑️
                        </button>
                    </div>
                `).join("");


            // Open folder
            document
                .querySelectorAll(".folder")
                .forEach(folderElement => {

                    folderElement.addEventListener(
                        "click",
                        function () {

                            const folderId =
                                this.dataset.folderId;

                            const folderName =
                                this.dataset.folderName;

                            openFolder(
                                folderId,
                                folderName
                            );
                        }
                    );
                });


            // Delete folder
            document
                .querySelectorAll(".delete-folder-btn")
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        function (event) {

                            event.stopPropagation();

                            const folderId =
                                this.dataset.deleteFolderId;

                            deleteFolder(folderId);
                        }
                    );
                });
        }


        // Populate folder dropdown
        if (folderSelect) {

            folderSelect.innerHTML = `
                <option value="">
                    Select Folder
                </option>
            `;

            folders.forEach(folder => {

                folderSelect.innerHTML += `
                    <option value="${folder.id}">
                        ${folder.name}
                    </option>
                `;

            });
        }


    } catch (error) {

        console.error(error);

        const container =
            document.getElementById("foldersContainer");

        if (container) {

            container.innerHTML = `
                <p>
                    Unable to load folders.
                </p>
            `;
        }
    }
}


// ==============================
// OPEN FOLDER
// ==============================

async function openFolder(folderId, folderName) {

    try {

        const response =
            await fetch(`/api/users/${userId}/cards`);

        const cards =
            await response.json();

        if (!response.ok) {
            throw new Error(
                cards.error ||
                "Failed to load cards"
            );
        }


        // Only selected folder cards
        const folderCards =
            cards.filter(card =>
                Number(card.folder_id) === Number(folderId)
            );


        const container =
            document.getElementById("cardsContainer");

        if (!container) {
            return;
        }


        // No cards
        if (folderCards.length === 0) {

            container.innerHTML = `
                <div
                    class="loading"
                    style="grid-column:1/-1;"
                >
                    <h3>📁 ${folderName}</h3>

                    <p>
                        No cards in this folder.
                    </p>
                </div>
            `;

            return;
        }


        // Folder cards
        container.innerHTML = `

            <div style="grid-column:1/-1;">

                <h2>📁 ${folderName}</h2>

                <p>
                    Cards in this folder
                </p>

            </div>


            ${folderCards.map(card => `

                <div class="card">

                    <h3>
                        ${card.title || "My Card"}
                    </h3>


                    <p>
            <strong>Card Number:</strong>
                        ${maskCardNumber(card.card_number)}
                    </p>


                    <p>
                        <strong>Expiry:</strong>
                        ${card.expiry || "N/A"}
                    </p>


                    <p>
                        <strong>CVV:</strong>
                        •••
                    </p>


                    <p>
                        <strong>Folder:</strong>
                        ${card.folder_name || folderName}
                    </p>


                    <button
                        onclick="deleteCard(${card.id})"
                        style="
                            margin-top:15px;
                            padding:10px 16px;
                            border:none;
                            border-radius:8px;
                            background:#dc2626;
                            color:white;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        🗑️ Delete Card
                    </button>

                </div>

            `).join("")}

        `;

    } catch (error) {

        console.error(error);

        alert("Unable to open folder.");
    }
}


// ==============================
// DELETE CARD
// ==============================

async function deleteCard(cardId) {

    if (!confirm(
        "Are you sure you want to delete this card?"
    )) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/users/${userId}/cards/${cardId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Failed to delete card."
            );

            return;
        }


        alert(
            "Card deleted successfully."
        );


        // Reload all cards
        loadDashboard();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete card."
        );
    }
}


// ==============================
// DELETE FOLDER
// ==============================

async function deleteFolder(folderId) {

    if (!confirm(
        "Are you sure you want to delete this folder?"
    )) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/users/${userId}/folders/${folderId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Failed to delete folder."
            );

            return;
        }


        alert(
            "Folder deleted successfully."
        );


        loadFolders();
        loadDashboard();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete folder."
        );
    }
}


// ==============================
// SAVE CARD
// ==============================


// Keep the physical-style card preview synchronized with the form.
function updateCardPreview() {
    const bankSelect = document.getElementById("cardTitle");
    const holderInput = document.getElementById("cardHolder");
    const numberInput = document.getElementById("cardNumber");
    const expiryInput = document.getElementById("cardExpiry");
    const bankLabel = document.getElementById("previewBank");
    const numberLabel = document.getElementById("previewNumber");
    const holderLabel = document.getElementById("previewHolder");
    const expiryLabel = document.getElementById("previewExpiry");
    const networkLabel = document.getElementById("previewNetwork");
    const card = document.getElementById("liveCard");
    if (!bankSelect || !holderInput || !numberInput || !expiryInput || !card) return;

    const bank = bankSelect.value || "State Bank of India (SBI)";
    const bankShort = bank.includes("SBI") ? "SBI" : bank.replace(" Bank", "");
    bankLabel.textContent = "◉ " + bankShort;
    const digits = numberInput.value.replace(/\D/g, "").slice(0, 19);
    numberLabel.textContent = digits ? digits.replace(/(.{4})/g, "$1 ").trim() : "•••• •••• •••• ••••";
    holderLabel.textContent = holderInput.value.trim().toUpperCase() || "YOUR NAME";
    expiryLabel.textContent = expiryInput.value.trim() || "MM/YY";
    networkLabel.textContent = /^4/.test(digits) ? "VISA" : /^(5[1-5]|2[2-7])/.test(digits) ? "Mastercard" : /^(60|65|81|82|508)/.test(digits) ? "RuPay" : "VISA";

    const themes = {
        "State Bank of India (SBI)": ["#092957", "#1766a7", "#0c2d60"],
        "Bank of Baroda": ["#5b1519", "#a8272e", "#3b1016"],
        "Union Bank of India": ["#063f3a", "#078578", "#052c35"],
        "HDFC Bank": ["#092b68", "#2368bd", "#10234c"],
        "ICICI Bank": ["#6d2814", "#d46b25", "#522018"],
        "Axis Bank": ["#35104f", "#753b9c", "#20123d"],
        "Canara Bank": ["#642020", "#b34336", "#38141d"],
        "Punjab National Bank": ["#6a1c28", "#bd3746", "#351329"],
        "Other Bank": ["#202b43", "#53657e", "#151d2d"]
    };
    const colors = themes[bank] || themes["Other Bank"];
    const bankClasses = {
        "State Bank of India (SBI)": "bank-sbi",
        "Bank of Baroda": "bank-bob",
        "Union Bank of India": "bank-union",
        "HDFC Bank": "bank-hdfc",
        "ICICI Bank": "bank-icici",
        "Axis Bank": "bank-axis",
        "Canara Bank": "bank-canara",
        "Punjab National Bank": "bank-pnb",
        "Other Bank": "bank-other"
    };
    Object.values(bankClasses).forEach(className => card.classList.remove(className));
    card.classList.add(bankClasses[bank] || "bank-other");
    card.dataset.bank = bank;
    card.style.backgroundImage = `radial-gradient(ellipse at 100% 0%, ${colors[1]}, transparent 42%), radial-gradient(ellipse at 0% 100%, rgba(0,0,0,.32), transparent 52%), linear-gradient(135deg, ${colors[0]}, ${colors[1]} 56%, ${colors[2]})`;
}

["cardTitle", "cardHolder", "cardNumber", "cardExpiry"].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.addEventListener("input", updateCardPreview);
    if (field) field.addEventListener("change", updateCardPreview);
});

document.addEventListener("DOMContentLoaded", updateCardPreview);

async function saveCard() {

    const title =
        document
            .getElementById("cardTitle")
            .value
            .trim();
const cardHolder =
    document
        .getElementById("cardHolder")
        .value
        .trim();

    const cardNumber =
        document
            .getElementById("cardNumber")
            .value
            .trim();


    const expiry =
        document
            .getElementById("cardExpiry")
            .value
            .trim();


    const cvv =
        document
            .getElementById("cardCvv")
            .value
            .trim();


    const folderId =
        document
            .getElementById("cardFolder")
            .value;


    // Validate card
    if (
        !title ||
        !cardHolder ||
        !cardNumber ||
        !expiry ||
        !cvv
    ) {

        alert(
            "Please fill all card details."
        );

        return;
    }


    // Folder mandatory
    if (!folderId) {

        alert(
            "Please select a folder."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `/api/users/${userId}/cards`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        title: title,
                       card_holder: cardHolder,
                        card_number: cardNumber,

                        expiry: expiry,

                        cvv: cvv,

                        folder_id:
                            parseInt(folderId)

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.error ||
                "Failed to save card."
            );

            return;
        }


        alert(
            "Card saved successfully."
        );


        // Clear form
        document
            .getElementById("cardTitle")
            .value = "";


        document
            .getElementById("cardHolder")
            .value = "";

        document
            .getElementById("cardNumber")
            .value = "";


        document
            .getElementById("cardExpiry")
            .value = "";


        document
            .getElementById("cardCvv")
            .value = "";


        document
            .getElementById("cardFolder")
            .value = "";


        // Refresh the preview and saved-card list
        updateCardPreview();
        loadDashboard();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to save card."
        );
    }
}


// ==============================
// SIDEBAR NAVIGATION
// ==============================

document
    .querySelectorAll(".sidebar nav a")
    .forEach(link => {

        link.addEventListener(
            "click",
            function (event) {

                const targetId =
                    this.getAttribute("href");


                if (
                    targetId &&
                    targetId.startsWith("#")
                ) {

                    event.preventDefault();


                    const target =
                        document.querySelector(targetId);


                    if (target) {

                        target.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }

                }

            }
        );

    });


// ==============================
// START
// ==============================

// ==============================
// LOAD USER DETAILS
// ==============================

async function loadUser() {

    try {

        const response =
            await fetch(`/api/users/${userId}`);

        const user =
            await response.json();

        if (!response.ok) {
            throw new Error(
                user.error ||
                "Failed to load user"
            );
        }
userName = user.name;
        const avatar =
            document.getElementById("userAvatar");

        const email =
            document.getElementById("userEmail");

            const settingsName =
    document.getElementById("settingsUserName");

        if (avatar) {
            avatar.textContent =
                user.name.charAt(0).toUpperCase();
        }

        if (email) {
            email.textContent =
                user.email;
        }
        if (settingsName) {
    settingsName.textContent =
        user.name;
}

    } catch (error) {

        console.error(error);

    }
}
loadUser()

loadDashboard();

loadFolders();
