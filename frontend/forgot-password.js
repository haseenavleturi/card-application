const form = document.getElementById("forgotPasswordForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    message.textContent = "Processing your request...";

    try {
        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        message.replaceChildren();

        const text = document.createElement("p");
        text.textContent = data.message || data.error || "Please try again.";
        message.appendChild(text);

        // Development testing only: display the generated reset link.
        if (response.ok && data.reset_link) {
            const link = document.createElement("a");
            link.href = data.reset_link;
            link.textContent = "Open Reset Password page";
            message.appendChild(link);
        }
    } catch (error) {
        message.textContent =
            "Unable to connect to the server. Please try again.";
    }
});
