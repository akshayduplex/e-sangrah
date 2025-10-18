/**
 * Returns HTML content for OTP email
 * @param {string} name - User's name
 * @param {string} otp - 4-digit OTP
 * @param {number} expiryMinutes - OTP validity in minutes
 */
export const loginOtpTemplate = (name, otp, expiryMinutes = 10) => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${name},</h2>
        <p>Your OTP for login is:</p>
        <h1 style="color: #007bff;">${otp}</h1>
        <p>This OTP is valid for ${expiryMinutes} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">Support Team</p>
    </div>
`;
