/**
 * HTML email for document invitation
 * @param {Object} params
 * @param {string} params.fileName
 * @param {string} params.accessLevel
 * @param {Date|null} params.expiresAt
 * @param {string} params.inviteLink
 */
export const inviteUserTemplate = ({ fileName, accessLevel, expiresAt, inviteLink }) => `
    <h2>You've been invited to access a document</h2>
    <p><strong>Document:</strong> ${fileName || "Untitled Document"}</p>
    <p><strong>Access:</strong> ${accessLevel}</p>
    ${expiresAt ? `<p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>` : ""}
    <a href="${inviteLink}" style="background:#007bff;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Open Document</a>
    <p>If the button doesn't work, copy this link:<br>${inviteLink}</p>
`;