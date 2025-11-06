export const approvalRequestTemplate = ({
    approverName,
    documentName,
    description,
    departmentName,
    requesterName,
    verifyUrl,
}) => `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <p>Dear ${approverName || "Approver"},</p>
        <p>You have been requested to review and approve the following document:</p>
        <ul>
            <li><b>Document:</b> ${documentName}</li>
            <li><b>Description:</b> ${description || "No description provided"}</li>
            <li><b>Department:</b> ${departmentName || "N/A"}</li>
            <li><b>Requested by:</b> ${requesterName || "N/A"}</li>
        </ul>
        <p>Please click the button below to verify and approve/reject the document:</p>
        <p>
            <a href="${verifyUrl}" target="_blank" 
               style="padding:10px 15px;background:#007bff;color:#fff;
                      text-decoration:none;border-radius:5px;">
                Review Document
            </a>
        </p>
        <p>This link will expire in 7 days.</p>
        <br>
        <p>Best regards,<br><b>DocuFlow System</b></p>
    </div>
`;
