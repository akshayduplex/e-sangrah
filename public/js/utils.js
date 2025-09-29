
// Global API Fetch Utility
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            credentials: "include",
            ...options
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}


// Success Notification
function showSuccess(message) {
    // Example with Toastify.js (production UI)
    Toastify({
        text: message,
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
        stopOnFocus: true
    }).showToast();
}

// Error Notification
function showError(message) {
    Toastify({
        text: ` ${message}`,
        duration: 5000,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true
    }).showToast();

    console.error(`[ERROR]: ${message}`);
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
