// Base Toast function
function showToast(message, type = "info", duration = 4000) {
    const colors = {
        success: "#2B1871",
        error: "#e74c3c",
        info: "#3498db",
        warning: "#f39c12"
    };

    Toastify({
        text: message || "No message provided",
        duration: duration,
        gravity: "top",
        position: "right",
        backgroundColor: colors[type] || colors.info,
        stopOnFocus: true,
        close: true // allows user to manually close the toast
    }).showToast();
}

// Convenience wrappers
function showSuccess(message, duration) {
    showToast(message, "success", duration);
}

function showError(message, duration) {
    showToast(message, "error", duration);
}

function showInfo(message, duration) {
    showToast(message, "info", duration);
}

function showWarning(message, duration) {
    showToast(message, "warning", duration);
}
