// utils/emailTemplates.js

/**
 * Generates HTML for the "Folder Shared" email
 * @param {Object} params
 * @param {string} params.userName - Recipient name
 * @param {string} params.senderName - Name of the person sharing
 * @param {string} params.folderName - Folder name
 * @param {string} params.access - Access level
 * @param {string} params.folderLink - Share link
 * @returns {string} HTML content
 */
export const folderSharedTemplate = ({ userName, senderName, folderName, access, folderLink }) => `
    <p>Hi ${userName || "there"},</p>
    <p>${senderName || "Someone"} has shared a folder with you.</p>
    <p><strong>Folder Name:</strong> ${folderName}</p>
    <p><strong>Access Level:</strong> ${access}</p>
    <p>
        <a href="${folderLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">
            View Folder
        </a>
    </p>
    <p>Best,<br>Your App Team</p>
`;
