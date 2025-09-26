import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

// Configure transporter once
const transporter = nodemailer.createTransport({
    service: "gmail", // or another provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * Global function to send emails
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} [fromName="Support Team"] - Display name for the sender
 */
export const sendEmail = async ({ to, subject, html, fromName = "Support Team" }) => {
    try {
        await transporter.sendMail({
            from: `"${fromName}" <no-reply@example.com>`, // hides real email
            to,
            subject,
            html,
            replyTo: process.env.EMAIL_USER, // optional: replies go to your real email
        });
    } catch (error) {
        logger.error("Email sending failed:", error);
        throw new Error("Email could not be sent");
    }
};
