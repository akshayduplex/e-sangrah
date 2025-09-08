function showSuccess(message) {
    Toastify({
        text: message,
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "#2B1871", // custom success color
        stopOnFocus: true
    }).showToast();
}

function showError(message) {
    Toastify({
        text: message,
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "#e74c3c", // standard red
        stopOnFocus: true
    }).showToast();
}
