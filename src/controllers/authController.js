import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import {
    successResponse,
    failResponse,
    errorResponse,
} from "../utils/responseHandler.js";
import { getOtpEmailHtml } from "../emailTemplates/OtpEmailTemplate.js";

import crypto from "crypto"
import { sendEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";
import UserToken from "../models/UserToken.js";
import { loginOtpTemplate } from "../emailTemplates/loginOtpTemplate.js";

const otpStore = {};

// ---------------------------
// Register
// ---------------------------

export const getRegisterPage = (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
};

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            raw_password,
            password,
            profile_type = "user",
            status = "Active",
            phone_number,
            address,
            userDetails,
            vendorDetails,
            donorDetails
        } = req.body;

        // Required fields
        if (!name || !email || !raw_password) {
            return failResponse(res, "Name, email, and password are required", 400);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return failResponse(res, "User already exists with this email", 409);

        // Create user
        const user = new User({
            name,
            email,
            raw_password,
            password,
            profile_type,
            status,
            phone_number,
            address,
            userDetails: userDetails || undefined,
            vendorDetails: vendorDetails || undefined,
            donorDetails: donorDetails || undefined
        });

        await user.save();

        // Convert to object and remove sensitive fields
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.raw_password;

        return successResponse(res, userResponse, "User registered successfully", 201);
    } catch (err) {
        logger.error("Register error:", err);
        return errorResponse(res, err);
    }
};


// ---------------------------
// Login
// ---------------------------

export const getLoginPage = (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email }).select("+password");
        if (!user) return failResponse(res, "User not found", 401);

        //Password change verification check
        if (user.passwordVerification === "pending") {
            return failResponse(
                res,
                "Your password change is pending verification. Please check your email.",
                403
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return failResponse(res, "Password incorrect", 401);

        const now = new Date();

        // Check for existing token
        let userToken = await UserToken.findOne({ user: user._id });

        if (userToken && userToken.expiresAt > now) {
            try {
                const decoded = jwt.verify(userToken.token, API_CONFIG.JWT_SECRET);

                if (decoded.email !== user.email) {
                    return failResponse(res, "Token invalid for this user", 401);
                }

                if (user.status !== "Active") {
                    return failResponse(res, "User is not active", 403);
                }

                req.session.user = {
                    _id: user._id,
                    designation_id: user.userDetails?.designation || null,
                    department: user.userDetails?.department || null,
                    email: user.email,
                    profile_type: user.profile_type,
                    name: user.name,
                };

                //Return login success WITHOUT OTP
                return successResponse(res, {
                    message: "Login successful",
                    requireOTP: false,
                    user
                });
            } catch (err) {
                logger.error("Token verification failed:", err.message);
                // fall back to OTP flow
            }
        }


        // 6️⃣ No valid token -> generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

        // Save OTP and expiry to user
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();
        // Send OTP email
        await sendEmail({
            to: email,
            subject: "Your Login OTP",
            html: loginOtpTemplate(user.name, otp, 10),
            fromName: "DMS Support Team"
        });
        return successResponse(res, {
            message: "OTP sent to your registered email/phone",
        });

    } catch (err) {
        console.error("Login error:", err);
        return errorResponse(res, "Internal server error");
    }
};


export const verifyTokenOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email }).select("+otp +otpExpiresAt");;
        if (!user) return failResponse(res, "User not found", 404);
        // Check OTP
        if (!user.otp || user.otpExpiresAt < new Date()) {
            return failResponse(res, "OTP expired, please login again", 400);
        }
        if (user.otp !== otp) return failResponse(res, "Invalid OTP", 400);

        // OTP valid -> generate token
        const tokenValue = user.generateAuthToken();
        const tokenExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

        // Save token in DB
        await UserToken.findOneAndUpdate(
            { user: user._id },
            { token: tokenValue, expiresAt: tokenExpiry },
            { upsert: true }
        );

        // Clear OTP
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();

        // Set session
        req.session.user = {
            _id: user._id,
            designation_id: user.userDetails?.designation,
            department: user.userDetails?.department,
            email: user.email,
            profile_type: user.profile_type,
            name: user.name,
        };

        return successResponse(res, { token: tokenValue, user: user.toJSON() }, "OTP verified, login successful");

    } catch (err) {
        console.error("OTP verification error:", err);
        return errorResponse(res, "Internal server error");
    }

};



// ---------------------------
// Get Logged-in User
// ---------------------------

export const getForgotPasswordPage = (req, res) => {
    res.render("pages/forgot-password", {
        otpSent: false,
        otpVerified: false,
        email: "",
        message: null,
        error: null,
    });
};

export const getResetPasswordPage = (req, res) => {
    res.render("pages/reset-password", {
        otpSent: false,
        otpVerified: false,
        email: req.user.email,
        message: null,
        user: req.user,
        error: null,
    });
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

        await sendEmail({
            to: email,
            subject: "Your OTP for Password Reset",
            html: htmlContent,
            fromName: "DMS Support Team",
        });

        return successResponse(res, {}, "OTP sent to your email");
    } catch (err) {
        logger.error("Error sending OTP:", err);
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
// Send Password Reset Link (after password entry)
// ---------------------------

export const sendResetLink = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        // Validate inputs
        if (!email || !password || !confirmPassword) {
            return failResponse(res, "All fields are required", 400);
        }

        if (password !== confirmPassword) {
            return failResponse(res, "Passwords do not match", 400);
        }

        const user = await User.findOne({ email });
        if (!user) return failResponse(res, "User not found", 404);

        // Generate secure token
        const token = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Store token and new password (for demo; use DB or Redis in prod)
        otpStore[email] = {
            resetToken: token,
            newPassword: password,
            expires: tokenExpiry
        };

        user.passwordVerification = "pending";
        await user.save();

        // Destroy session (wrapped in promise)
        await new Promise((resolve) => {
            req.session.destroy((err) => {
                if (err) logger.error("Session destroy error:", err);

                res.clearCookie("connect.sid", {
                    path: "/",
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                });
                resolve();
            });
        });

        // Send reset link
        const resetLink = `${API_CONFIG.baseUrl || 'http://localhost:5000'}/api/auth/verify-reset/${token}?email=${encodeURIComponent(email)}`;

        // Email HTML content
        const htmlContent = `
            <p>You have requested to change your password. Click the link below to verify this change:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this change, please ignore this email.</p>
        `;


        await sendEmail({
            to: email,
            subject: "Verify Password Change",
            html: htmlContent,
            fromName: "Your App",
        });
        return successResponse(res, {}, "Verification link sent to your email. Please check your email to complete the process.");

    } catch (err) {
        logger.error("Send reset link error:", err);
        return errorResponse(res, err);
    }
};

export const verifyResetLink = async (req, res) => {
    try {
        const { token } = req.params;
        const { email } = req.query;

        const otpEntry = otpStore[email];
        if (!otpEntry || otpEntry.resetToken !== token) {
            return failResponse(res, "Invalid or expired reset link", 400);
        }

        if (otpEntry.expires < Date.now()) {
            delete otpStore[email];
            return failResponse(res, "Reset link expired", 400);
        }

        const user = await User.findOne({ email });
        if (!user) return failResponse(res, "User not found", 404);

        user.raw_password = otpEntry.newPassword;
        user.passwordVerification = "verified";
        await user.save();

        delete otpStore[email];

        // Destroy session and clear cookie
        await new Promise((resolve) => {
            req.session.destroy((err) => {
                if (err) logger.error("Session destroy error:", err);

                res.clearCookie("connect.sid", {
                    path: "/",
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                });
                resolve();
            });
        });

        return res.redirect("/login?success=Password+updated");

    } catch (err) {
        logger.error("Verify reset link error:", err);
        return errorResponse(res, err);
    }
};

// Render My Profile page
export const showMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("pages/myprofile", { user });
    } catch (err) {
        logger.error("Error loading profile:", err);
        res.status(500).send("Server Error");
    }
};

// POST update profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId)
            .populate("userDetails.designation", "name")
            .populate("userDetails.department", "name")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email, phone_number, department, designation, address } = req.body;


        const updateFields = { name, email, phone_number, address };

        if (department) updateFields["userDetails.department"] = department;
        if (designation) updateFields["userDetails.designation"] = designation;
        if (req.file) updateFields.profile_image = req.file.path;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        )
            .populate("userDetails.designation", "name")
            .populate("userDetails.department", "name")
            .lean();

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



