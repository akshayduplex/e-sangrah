import nodemailer from "nodemailer";

// Make sure you have these in your .env:
// EMAIL_USER=support@example.com
// EMAIL_PASSWORD=your-email-password-or-app-password

const transporter = nodemailer.createTransport({
    service: "gmail", // or another provider if needed
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Function to send registration emails
const sendEmail = async ({ to, subject, text }) => {
    try {
        await transporter.sendMail({
            from: `"HLFPPT Support" <${process.env.EMAIL_USER}>`, // no-reply style
            to,
            subject,
            text,
        });
    } catch (error) {
        console.error("Email sending failed:", error);
        throw new Error("Email could not be sent");
    }
};

export default sendEmail;
