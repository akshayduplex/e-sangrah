// otpEmailTemplate.js

export function sendShareNotification(folderName, sharedBy, accessLevel, message, shareToken, folderId, action = 'shared') {
    return `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        
        ${action === 'shared' ? `
          <p><strong>${sharedBy}</strong> has shared a folder with you:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin: 0; color: #333;">${folderName}</h3>
            <p style="margin: 5px 0; color: #666;">Access Level: <strong>${accessLevel}</strong></p>
          </div>
          
          ${message ? `<p><strong>Message from ${sharedBy}:</strong> ${message}</p>` : ''}
          
          <div style="margin: 20px 0;">
            <a href="${process.env.APP_URL}/folders/${folderId}" 
               style="background: #4285f4; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Open Folder
            </a>
          </div>
        ` : `
          <p>Your access to the folder "<strong>${folderName}</strong>" has been removed by <strong>${sharedBy}</strong>.</p>
          <p>You will no longer be able to view or edit the contents of this folder.</p>
        `}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from ${process.env.APP_NAME}.
        </p>
      </div>
    `;
}
