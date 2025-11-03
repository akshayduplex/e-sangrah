
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
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatDateTime(dateInput, { showDate = true, showTime = true, locale = 'en-GB' } = {}) {
    if (!dateInput) return '';

    const date = new Date(dateInput);
    if (isNaN(date)) return '';

    const options = {};
    if (showDate) {
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
    }
    if (showTime) {
        options.hour = '2-digit';
        options.minute = '2-digit'; // only up to minutes
        options.hour12 = false; // 24-hour format (set true for 12-hour)
    }

    return date.toLocaleString(locale, options);
}

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

const statusClass = {
    'draft': 'bg-soft-info',
    'pending': 'bg-soft-warning',
    'approved': 'bg-soft-success',
    'rejected': 'bg-soft-danger',
    'underreview': 'bg-soft-warning',
    'archived': 'bg-soft-secondary'
}