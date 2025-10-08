// emailTemplates.js

/**
 * Email template for granting access
 * @param {Object} params
 * @param {string} params.fileName
 * @param {string} params.duration
 * @param {Date|null} params.expiresAt
 * @param {string} params.viewDocLink
 */
export const accessGrantedTemplate = ({ fileName, duration, expiresAt, viewDocLink }) => {
    return `
        <h2>Access Granted</h2>
        <p>Your access to <strong>${fileName || "Document"}</strong> has been approved.</p>
        <p><strong>Duration:</strong> ${duration}</p>
        ${expiresAt ? `<p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>` : ""}
        <a href="${viewDocLink}"
            style="background:#007bff;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
            Open Document
        </a>
    `;
};

