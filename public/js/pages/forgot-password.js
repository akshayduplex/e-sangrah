document.addEventListener("DOMContentLoaded", function () {
    const emailInput = document.getElementById("exampleFormControlInput1");
    const sendOtpBtn = document.querySelector(".submitbtn");
    const otpSection = document.querySelector(".otpsection");
    const otpInputs = document.querySelectorAll(".otp-input");
    const passwordBoxes = document.querySelectorAll(".password-box");
    const loginBtn = document.querySelector(".btn-login");
    const resendBtn = document.querySelector(".simplebtn");
    const otpVerifiedText = document.querySelector(".wrapotp_check .text-success");

    let otpSent = false; // Track if OTP has been sent

    // -------------------- INITIAL RESET --------------------
    const resetAllFields = () => {
        if (emailInput) emailInput.value = "";
        otpInputs.forEach(inp => inp.value = "");
        passwordBoxes.forEach(box => {
            const input = box.querySelector("input");
            if (input) input.value = "";
        });
        if (otpSection) otpSection.style.display = "none";
        passwordBoxes.forEach(box => box.style.display = "none");
        if (loginBtn) loginBtn.style.display = "none";
        if (otpVerifiedText) otpVerifiedText.style.display = "none";
        if (sendOtpBtn) sendOtpBtn.disabled = false;
        otpSent = false;
    };

    resetAllFields(); // Clear everything on page load

    // -------------------- Send OTP FUNCTION --------------------
    const sendOtp = async () => {
        const email = emailInput.value.trim();
        if (!email) {
            showToast("Please enter your email", "warning");
            return;
        }

        sendOtpBtn.disabled = true; // Disable button immediately

        try {
            const response = await fetch("http://localhost:5000/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ email })
            });
            const data = await response.json();

            if (data.success) {
                showToast("OTP sent to your email!", "info");
                if (otpSection) otpSection.style.display = "block";
                otpInputs[0].focus();
                otpSent = true;
            } else {
                showToast(data.message || "Failed to send OTP.", "error");
                sendOtpBtn.disabled = false; // Re-enable if failed
            }
        } catch (err) {
            console.error("Send OTP error:", err);
            showToast("Something went wrong. Please try again.", "error");
            sendOtpBtn.disabled = false;
        }
    };

    // -------------------- Send OTP BUTTON --------------------
    sendOtpBtn.addEventListener("click", sendOtp);

    // -------------------- Resend OTP BUTTON --------------------
    resendBtn.addEventListener("click", function () {
        otpInputs.forEach(inp => inp.value = ""); // clear OTP inputs
        passwordBoxes.forEach(box => box.style.display = "none"); // hide password
        if (loginBtn) loginBtn.style.display = "none";
        if (otpVerifiedText) otpVerifiedText.style.display = "none";
        otpSection.style.display = "block"; // keep OTP section visible
        otpSent = false; // reset flag

        sendOtp(); // actually send a new OTP
    });

    // -------------------- OTP AUTO-FOCUS --------------------
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (input.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }

            if (otpSent && [...otpInputs].every(inp => inp.value.length === 1)) {
                verifyOtp();
            }
        });
    });

    // -------------------- VERIFY OTP --------------------
    const verifyOtp = async () => {
        if (!otpSent) {
            showToast("Please request an OTP first", "info");
            return;
        }

        const email = emailInput.value.trim();
        const otp = [...otpInputs].map(inp => inp.value).join("");

        try {
            const response = await fetch("http://localhost:5000/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ email, otp })
            });
            const data = await response.json();

            if (data.success) {
                if (otpVerifiedText) otpVerifiedText.style.display = "block";
                passwordBoxes.forEach(box => box.style.display = "block");
                loginBtn.style.display = "block";
                loginBtn.textContent = "Submit";
            } else {
                showToast(data.message || "Invalid OTP, try again.", "error");
                otpInputs.forEach(inp => inp.value = "");
                otpInputs[0].focus();
            }
        } catch (err) {
            console.error("Verify OTP error:", err);
            showToast("Something went wrong. Please try again.", "error");
        }
    };

    // -------------------- RESET PASSWORD --------------------
    loginBtn.addEventListener("click", async function () {
        const email = emailInput.value.trim();
        const password = document.getElementById("newPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        if (!password || !confirmPassword) {
            showToast("Please fill both password fields.", "info");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match!", "info");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ email, password, confirmPassword })
            });
            const data = await response.json();

            if (data.success) {
                showToast("Password reset successful! You can now login.", "success");
                window.location.href = "/login";
            } else {
                showToast(data.message || "Failed to reset password.", "error");
            }
        } catch (err) {
            console.error("Reset password error:", err);
            showToast("Something went wrong. Please try again.", "error");
        }
    });
});
