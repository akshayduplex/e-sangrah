document.addEventListener("DOMContentLoaded", () => {
    function showToast(message, type = "info", duration = 4000) {
        const colors = {
            success: "#2B1871",
            error: "#e74c3c",
            info: "#3498db",
            warning: "#f39c12"
        };

        Toastify({
            text: message || "No message provided",
            duration,
            gravity: "bottom",
            position: "right",
            backgroundColor: colors[type] || colors.info,
            stopOnFocus: true,
            close: true
        }).showToast(); // make sure this line stays
    }

    // Expose globally so you can call it anywhere
    window.showToast = showToast;
});
