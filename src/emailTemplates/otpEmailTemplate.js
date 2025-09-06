// otpEmailTemplate.js
function getOtpEmailHtml(userName, otp) {
    return `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>Hello ${userName || "User"},</h2>
            <p>You requested a password reset. Use the OTP below:</p>
            <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
            <br/>
            <p>— Your App Team</p>
        </div>
    `;
}

module.exports = { getOtpEmailHtml };
