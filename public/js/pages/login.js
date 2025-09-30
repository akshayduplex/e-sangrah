// login.js

// -------- Utility Functions --------
const baseUrl = window.baseUrl || "";

// Show error message
function showError(message) {
    const loginMessage = document.getElementById("loginMessage");
    if (loginMessage) {
        loginMessage.textContent = message;
        loginMessage.classList.remove("text-success");
        loginMessage.classList.add("text-danger");
    }
}

// Show success message
function showSuccess(message) {
    const loginMessage = document.getElementById("loginMessage");
    if (loginMessage) {
        loginMessage.textContent = message;
        loginMessage.classList.remove("text-danger");
        loginMessage.classList.add("text-success");
    }
}

// Show/Hide Password
function togglePassword(inputId, toggleEl) {
    const input = document.getElementById(inputId);
    const icon = toggleEl.querySelector("i");
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

// Attach password toggle buttons
function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach(toggle => {
        const targetInput = toggle.previousElementSibling?.id;
        if (targetInput) {
            toggle.addEventListener("click", () => togglePassword(targetInput, toggle));
        }
    });
}

// -------- Auth Handlers --------

// Handle login submission
async function handleLogin({ emailInput, passwordInput, loginBtn }) {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
        showError("Please enter a valid email.");
        return;
    }
    if (!password) {
        showError("Password is required.");
        return;
    }

    // Disable button while processing
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include"
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            showSuccess("Login successful! Redirecting...");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1000);
        } else {
            showError(data.message || "Login failed. Please try again.");
        }
    } catch (error) {
        showError("Network error. Please try again later." + error, "error");
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Submit";
    }
}

// Handle logout link
async function handleLogoutLink(logoutLink) {
    logoutLink.textContent = "Logging out...";

    try {
        const response = await fetch(`${baseUrl}/api/auth/logout`, {
            method: "POST",
            credentials: "include"
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            window.location.href = "/login"; // redirect after logout
        } else {
            showError(data.message || "Logout failed. Try again.");
            logoutLink.textContent = "Logout";
        }
    } catch (error) {
        showError("Network error. Please try again later." + error, 'error');
        logoutLink.textContent = "Logout";
    }
}


// -------- Initialization --------
function initLoginPage() {
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const logoutLink = document.getElementById("logoutLink"); // anchor tag

    // Init features
    initPasswordToggles();

    // Bind login handler
    if (loginBtn && emailInput && passwordInput) {
        loginBtn.addEventListener("click", () =>
            handleLogin({ emailInput, passwordInput, loginBtn })
        );
    }

    // Bind logout link
    if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            handleLogoutLink(logoutLink);
        });
    }
}

// Run once DOM is parsed (script has defer)
initLoginPage();
