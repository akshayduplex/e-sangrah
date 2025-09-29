
export function formatDateDDMMYYYY(date) {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}


/**
 * formatDateISO
 * Converts a Date object to ISO format (YYYY-MM-DD) for input fields.
 * @param {Date} date 
 * @returns {string|null}
 */
export function formatDateISO(date) {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
}

/**
 * parseDateDDMMYYYY
 * Converts a dd/mm/yyyy string into a Date object.
 * @param {string} dateStr - date in dd/mm/yyyy format
 * @returns {Date|null}
 */
export function parseDateDDMMYYYY(dateStr) {
    if (!dateStr) return null;

    const parts = dateStr.split(/[\/\-]/); // allow both "/" and "-"
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    // validate (e.g., reject 31/02/2025)
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}
