/**
 * folderAccessRequestTemplate
 * @param {Object} params
 * @param {string} params.requesterName - Name of the user requesting access
 * @param {string} params.requesterEmail - Email of the requester
 * @param {string} params.folderName - Name of the folder
 * @param {string} params.grantLinksHtml - Pre-rendered HTML for duration buttons
 */
export const folderAccessRequestTemplate = ({ requesterName, requesterEmail, folderName, grantLinksHtml }) => `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #007bff;">Folder Access Request</h2>
    <p><strong>${requesterName}</strong> (<a href="mailto:${requesterEmail}">${requesterEmail}</a>) requested access to your folder:</p>
    <p style="font-weight:bold; font-size:16px;">"${folderName}"</p>

    <p>You can grant access by clicking one of the buttons below:</p>
    <ul style="list-style: none; padding: 0;">
      ${grantLinksHtml}
    </ul>

    <p style="margin-top:20px; font-size:12px; color:#666;">
      This link is valid for 3 days. If you ignore it, the requester will need to send a new request.
    </p>
  </body>
</html>
`;
