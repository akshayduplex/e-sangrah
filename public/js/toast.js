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
            gravity: "top",
            position: "right",
            backgroundColor: colors[type] || colors.info,
            stopOnFocus: true,
            close: true
        }).showToast(); // <--- must call this
    }

    window.showToast = showToast;
});
