// login.js

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const loginMessage = document.getElementById("loginMessage");

    // Show/Hide Password
    const togglePassword = (id, el) => {
        const input = document.getElementById(id);
        const icon = el.querySelector("i");
        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    };

    // Attach toggle to all password-toggle elements
    document.querySelectorAll(".password-toggle").forEach(toggle => {
        const targetInput = toggle.previousElementSibling.id;
        toggle.addEventListener("click", () => togglePassword(targetInput, toggle));
    });

    // Handle login
    loginBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Clear previous messages
        loginMessage.textContent = "";
        loginMessage.classList.remove("text-success", "text-danger");

        if (!email || !password) {
            loginMessage.textContent = "Please enter both email and password.";
            loginMessage.classList.add("text-danger");
            return;
        }

        // Disable button while processing
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include" // allow session cookies
            });

            const data = await response.json();

            if (response.ok && data.success) {
                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.classList.add("text-success");

                setTimeout(() => {
                    window.location.href = "/dashboard"; // adjust to your dashboard route
                }, 1000);
            } else {
                loginMessage.textContent = data.message || "Login failed. Please try again.";
                loginMessage.classList.add("text-danger");
            }
        } catch (error) {
            console.error(error);
            loginMessage.textContent = "Something went wrong. Please try again later.";
            loginMessage.classList.add("text-danger");
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Submit";
        }
    });
});
