// emailTemplates.js

/**
 * Email template for access request to document owner
 * @param {Object} params
 * @param {string} params.requesterName
 * @param {string} params.requesterEmail
 * @param {string} params.fileName
 * @param {string} params.grantLinksHtml
 */
export const accessRequestTemplate = ({ requesterName, requesterEmail, fileName, grantLinksHtml }) => {
    return `
        <div style="font-family:Arial, sans-serif; padding:20px; background:#f8f9fa;">
            <div style="max-width:600px; margin:auto; background:white; padding:30px;
                        border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color:#333;">Access Request Received</h2>
                <p><strong>${requesterName || requesterEmail}</strong> has requested access to your document:</p>
                <p><strong>${fileName || "Untitled Document"}</strong></p>
                <p>Click one of the buttons below to grant access for a specific duration:</p>
                <ul style="list-style:none;padding:0;">${grantLinksHtml}</ul>
                <p style="margin-top:20px;color:#777;font-size:13px;">
                    This link will expire in 3 days. Do not share it with others.
                </p>
            </div>
        </div>
    `;
};
