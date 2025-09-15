// import User from "../../models/User.js";
// import bcrypt from "bcryptjs";
// import nodemailer from "nodemailer";

// import { successResponse, failResponse, errorResponse } from "../../utils/responseHandler.js";
// import { getOtpEmailHtml } from "../../emailTemplates/otpEmailTemplate.js";

// // In-memory OTP store (demo only; use DB in production)
// const otpStore = {};

// // ---------------------------
// // Register
// // ---------------------------
// export const register = async (req, res) => {
//     // try {
//     //     const { name, email, password, raw_password, role, department, position } = req.body;

//     //     if (!name || !email || !password) {
//     //         return failResponse(res, "Name, email, and password are required", 400);
//     //     }

//     //     const existingUser = await User.findOne({ email });
//     //     if (existingUser) return failResponse(res, "User already exists with this email", 409);

//     //     const user = new User({ name, email, password, raw_password, role: role || "employee", department, position });
//     //     await user.save();

//     //     const userResponse = user.toObject();
//     //     delete userResponse.password;

//     //     return successResponse(res, userResponse, "User registered successfully", 201);
//     // } catch (err) {
//     //     return errorResponse(res, err);
//     // }
//     try {
//         const { name, email, role, employeeDetails, vendorDetails, donorDetails, password, raw_password } = req.body;

//         if (!name || !email) {
//             return failResponse(res, "Name and email are required", 400);
//         }

//         // Check for existing user
//         const existingUser = await User.findOne({ email });
//         if (existingUser) return failResponse(res, "User already exists with this email", 409);

//         let finalRawPassword = raw_password || password;

//         // For employee, vendor, donor -> generate random password if none provided
//         if (["employee", "vendor", "donor"].includes(role)) {
//             finalRawPassword = generateRandomPassword(12);

//             try {
//                 await sendEmail({
//                     to: email,
//                     subject: "Your Account Credentials",
//                     text: `Hello ${name},\n\nYour account has been created.\n\nLogin email: ${email}\nPassword: ${finalRawPassword}\n\nPlease change your password after login.\n\nThank you.`
//                 });
//             } catch (emailError) {
//                 return failResponse(res, "User creation failed: Could not send email", 500);
//             }
//         }

//         if (!finalRawPassword) {
//             return failResponse(res, "Password is required for this role", 400);
//         }

//         // Create new user
//         const user = new User({
//             name,
//             email,
//             raw_password: finalRawPassword,
//             role: role || "user",
//             employeeDetails: role === "employee" ? employeeDetails : undefined,
//             vendorDetails: role === "vendor" ? vendorDetails : undefined,
//             donorDetails: role === "donor" ? donorDetails : undefined
//         });

//         await user.save();

//         const userResponse = user.toJSON(); // cleans password
//         return successResponse(res, userResponse, "User registered successfully", 201);

//     } catch (err) {
//         return errorResponse(res, err);
//     }

// };

// // ---------------------------
// // Login
// // ---------------------------
// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email }).select("+password");
//         if (!user) {
//             return failResponse(res, "User Not Found", 401);
//         }

//         const isPasswordValid = bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return failResponse(res, "Password incorrect", 401);
//         }

//         user.lastLogin = new Date();
//         await user.save();

//         req.session.user = {
//             _id: user._id,
//             // role: user.role,
//             name: user.name
//         };

//         const userResponse = user.toObject();
//         delete userResponse.password;

//         return successResponse(res, userResponse, "Login successful");
//     } catch (err) {
//         console.error("Login error:", err);
//         return errorResponse(res, "Internal server error");
//     }
// };

// // ---------------------------
// // Get Logged-in User
// // ---------------------------
// export const getMe = async (req, res) => {
//     try {
//         if (!req.session.user) return failResponse(res, "Not logged in", 401);

//         const user = await User.findById(req.session.user._id).populate("department", "name code");
//         if (!user) return failResponse(res, "User not found", 404);

//         return successResponse(res, user);
//     } catch (err) {
//         return errorResponse(res, err);
//     }
// };

// // ---------------------------
// // Logout
// // ---------------------------
// export const logout = async (req, res) => {
//     try {
//         req.session.destroy(err => {
//             if (err) {
//                 return errorResponse(res, "Failed to logout. Try again.", 500);
//             }

//             // Remove session cookie
//             res.clearCookie("connect.sid", {
//                 path: "/",         // must match cookie path
//                 httpOnly: true,    // prevent JS access
//                 secure: process.env.NODE_ENV === "production", // HTTPS only in prod
//                 sameSite: "lax"
//             });

//             return successResponse(res, {}, "Logged out successfully");
//         });
//     } catch (err) {
//         return errorResponse(res, err.message || "Server error", 500);
//     }
// };

// // ---------------------------
// // Change Password
// // ---------------------------
// export const changePassword = async (req, res) => {
//     try {
//         const { email, password, confirmPassword } = req.body;
//         if (!password || !confirmPassword) return failResponse(res, "Both current and new password are required", 400);
//         if (password !== confirmPassword) return failResponse(res, "Passwords do not match", 400);

//         const user = await User.findOne({ email }).select("+password");
//         if (!user) return failResponse(res, "User not found", 404);

//         user.password = password;
//         await user.save();

//         return successResponse(res, {}, "Password updated successfully");
//     } catch (err) {
//         return errorResponse(res, err);
//     }
// };

// // ---------------------------
// // Send OTP (for Forgot Password)
// // ---------------------------
// export const sendOtp = async (req, res) => {
//     try {
//         const { email } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) return failResponse(res, "User not found", 404);

//         // 4-digit OTP
//         const otp = Math.floor(1000 + Math.random() * 9000).toString();


//         otpStore[email] = {
//             code: otp,
//             expires: Date.now() + 10 * 60 * 1000
//         };

//         const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASSWORD
//             }
//         });

//         const htmlContent = getOtpEmailHtml(user.name, otp);

//         await transporter.sendMail({
//             from: `"Your App" <${process.env.EMAIL_USER}>`,
//             to: email,
//             subject: "Your OTP for Password Reset",
//             html: htmlContent
//         });

//         return successResponse(res, {}, "OTP sent to your email");
//     } catch (err) {
//         console.error("Error sending OTP:", err);
//         return errorResponse(res, err, "Failed to send OTP email");
//     }
// };

// // ---------------------------
// // Verify OTP
// // ---------------------------
// export const verifyOtp = (req, res) => {
//     try {
//         const { email, otp } = req.body;
//         if (!otpStore[email]) return failResponse(res, "Please request an OTP first", 400);
//         if (otpStore[email].expires < Date.now()) {
//             delete otpStore[email];
//             return failResponse(res, "OTP expired. Please request again", 400);
//         }
//         if (otpStore[email].code !== otp) return failResponse(res, "Invalid OTP", 400);

//         delete otpStore[email];
//         return successResponse(res, {}, "OTP Verified");
//     } catch (err) {
//         return errorResponse(res, err);
//     }
// };

// // ---------------------------
// // Reset Password (via OTP)
// // ---------------------------
// export const resetPassword = async (req, res) => {
//     try {
//         const { email, password, confirmPassword } = req.body;

//         if (password !== confirmPassword)
//             return failResponse(res, "Passwords do not match", 400);

//         const user = await User.findOne({ email });
//         if (!user) return failResponse(res, "User not found", 404);

//         // Set raw_password so the pre-save hook hashes it
//         user.raw_password = password;

//         // Optionally update password directly if you want a separate field
//         // user.password = await bcrypt.hash(password, 12); // alternative

//         await user.save();

//         return successResponse(
//             res,
//             {},
//             "Password successfully updated. You can now login."
//         );
//     } catch (err) {
//         return errorResponse(res, err, "Failed to reset password");
//     }
// };

import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import {
    successResponse,
    failResponse,
    errorResponse,
} from "../../utils/responseHandler.js";
import { getOtpEmailHtml } from "../../emailTemplates/otpEmailTemplate.js";
// Configure multer for file uploads

// In-memory OTP store (⚠️ replace with Redis/DB in production)
const otpStore = {};

// ---------------------------
// Register
// ---------------------------
export const register = async (req, res) => {
    try {
        const { name, email, password, raw_password, role, department, position } = req.body;

        if (!name || !email || !password) {
            return failResponse(res, "Name, email, and password are required", 400);
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return failResponse(res, "User already exists with this email", 409);

        const user = new User({ name, email, password, raw_password, role: role || "employee", department, position });
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        return successResponse(res, userResponse, "User registered successfully", 201);
    } catch (err) {
        return errorResponse(res, err);
    }
};




// ---------------------------
// Login
// ---------------------------
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return failResponse(res, "User Not Found", 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return failResponse(res, "Password incorrect", 401);
        }

        user.lastLogin = new Date();
        await user.save();

        req.session.user = {
            _id: user._id,
            profile_type: user.profile_type,
            name: user.name,
        };

        const userResponse = user.toJSON();
        return successResponse(res, userResponse, "Login successful");
    } catch (err) {
        console.error("Login error:", err);
        return errorResponse(res, "Internal server error");
    }
};

// ---------------------------
// Get Logged-in User
// ---------------------------
export const getMe = async (req, res) => {
    try {
        if (!req.session.user) return failResponse(res, "Not logged in", 401);

        const user = await User.findById(req.session.user._id)
            .populate("userDetails.department._id", "name")
            .populate("userDetails.designation._id", "name");

        if (!user) return failResponse(res, "User not found", 404);

        return successResponse(res, user.toJSON());
    } catch (err) {
        return errorResponse(res, err);
    }
};

// ---------------------------
// Logout
// ---------------------------
export const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return errorResponse(res, "Failed to logout. Try again.", 500);
            }

            res.clearCookie("connect.sid", {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });

            return successResponse(res, {}, "Logged out successfully");
        });
    } catch (err) {
        return errorResponse(res, err.message || "Server error", 500);
    }
};

// ---------------------------
// Change Password
// ---------------------------
export const changePassword = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        if (!password || !confirmPassword)
            return failResponse(res, "Both current and new password are required", 400);
        if (password !== confirmPassword)
            return failResponse(res, "Passwords do not match", 400);

        const user = await User.findOne({ email }).select("+password");
        if (!user) return failResponse(res, "User not found", 404);

        user.raw_password = password; // triggers hash in pre-save
        await user.save();

        return successResponse(res, {}, "Password updated successfully");
    } catch (err) {
        return errorResponse(res, err);
    }
};

// ---------------------------
// Send OTP
// ---------------------------
export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) return failResponse(res, "User not found", 404);

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore[email] = { code: otp, expires: Date.now() + 10 * 60 * 1000 };

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const htmlContent = getOtpEmailHtml(user.name, otp);

        await transporter.sendMail({
            from: `"Your App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your OTP for Password Reset",
            html: htmlContent,
        });

        return successResponse(res, {}, "OTP sent to your email");
    } catch (err) {
        console.error("Error sending OTP:", err);
        return errorResponse(res, err, "Failed to send OTP email");
    }
};

// ---------------------------
// Verify OTP
// ---------------------------
export const verifyOtp = (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!otpStore[email]) return failResponse(res, "Please request an OTP first", 400);
        if (otpStore[email].expires < Date.now()) {
            delete otpStore[email];
            return failResponse(res, "OTP expired. Please request again", 400);
        }
        if (otpStore[email].code !== otp) return failResponse(res, "Invalid OTP", 400);

        delete otpStore[email];
        return successResponse(res, {}, "OTP Verified");
    } catch (err) {
        return errorResponse(res, err);
    }
};

// ---------------------------
// Reset Password (via OTP)
// ---------------------------
export const resetPassword = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        if (password !== confirmPassword)
            return failResponse(res, "Passwords do not match", 400);

        const user = await User.findOne({ email });
        if (!user) return failResponse(res, "User not found", 404);

        user.raw_password = password;
        await user.save();

        return successResponse(
            res,
            {},
            "Password successfully updated. You can now login."
        );
    } catch (err) {
        return errorResponse(res, err, "Failed to reset password");
    }
};

// ---------------------------
// Helpers
// ---------------------------
function generateRandomPassword(length = 12) {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    return Array.from({ length }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
}

async function sendEmail({ to, subject, text }) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
    });
}
