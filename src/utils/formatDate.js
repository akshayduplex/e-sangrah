
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