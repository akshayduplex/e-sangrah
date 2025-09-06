// Global API Fetch Utility
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: options.method || "GET",
            credentials: "include", // send cookies/session automatically
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        // If response is not OK, throw with details
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error(`[fetchData] Error fetching ${url}:`, error);
        showError(error.message || "Unexpected error occurred");
        throw error; // rethrow so caller can handle if needed
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
