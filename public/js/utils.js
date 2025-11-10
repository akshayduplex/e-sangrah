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
        throw error;
    }
}

// Success Notification
function showSuccess(message) {
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
}

// Debounce Utility
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Format Date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
/**
 * Formats a date into a readable format (e.g. "Nov 3, 2025 08:45 PM")
 * @param {string|Date|number} dateInput - A date string, timestamp, or Date object
 * @returns {string} Formatted date and time
 */
function formatDateTime(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date)) return 'Invalid date';

    const formattedDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const formattedTime = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `${formattedDate} ${formattedTime}`;
}

function getFileIcon(fileName) {
    if (!fileName) return fileIcons.default;
    const ext = fileName.split('.').pop().toLowerCase();
    return fileIcons[ext] || fileIcons.default;
}


// File Icons Map
// const fileIcons = {
//     ppt: "/img/icons/fn1.png",
//     pptx: "/img/icons/fn1.png",
//     doc: "/img/icons/fn2.png",
//     docx: "/img/icons/fn2.png",
//     xls: "/img/icons/fn3.png",
//     xlsx: "/img/icons/fn3.png",
//     pdf: "/img/icons/fn4.png",
//     default: "/img/icons/fn1.png"
// };

// Status Class Map
const statusClass = {
    draft: 'bg-soft-info',
    pending: 'bg-soft-warning',
    approved: 'bg-soft-success',
    rejected: 'bg-soft-danger',
    underreview: 'bg-soft-warning',
    archived: 'bg-soft-secondary'
};
