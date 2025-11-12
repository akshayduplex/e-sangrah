import User from "../models/User.js";
import path from "path";
import ejs from "ejs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
    successResponse,
    failResponse,
    errorResponse,
} from "../utils/responseHandler.js";

import crypto from "crypto"
import { sendEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";
import UserToken from "../models/UserToken.js";
import { generateEmailTemplate } from "../helper/emailTemplate.js";
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
        const user = await User.findOne({ email })
            .select(
                "+password name email isActive preferences profile_type phone_number passwordVerification profile_image address userDetails status"
            )
            .populate([
                { path: "userDetails.designation", select: "name" },
                { path: "userDetails.department", select: "name" }
            ]);
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
                    designation: user.userDetails?.designation || null,
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


        // No valid token -> generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

        // Generate OTP and save
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Prepare data for the email template
        const data = {
            userName: user.name,
            otp,
            expiryMinutes: 10,
            BASE_URL: API_CONFIG.baseUrl
        };

        // Generate email HTML using your central template function
        const html = generateEmailTemplate('otp', data);

        // Send OTP email
        await sendEmail({
            to: email,
            subject: "Your Login OTP",
            html,
            fromName: "DMS Support Team",
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

        // Generate a 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Store OTP temporarily
        otpStore[email] = { code: otp, expires: Date.now() + 10 * 60 * 1000 }; // expires in 10 min

        // Prepare template data
        const data = {
            userName: user.name || "User",
            otp,
            expiryMinutes: 10,
            BASE_URL: API_CONFIG.baseUrl
        };

        // Generate HTML using your template system
        const html = generateEmailTemplate('passwordReset', data);

        // Send OTP email
        await sendEmail({
            to: email,
            subject: "Your OTP for Password Reset",
            html,
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

        // --- Input Validation ---
        if (!email || !password || !confirmPassword) {
            return failResponse(res, "All fields are required", 400);
        }

        if (password !== confirmPassword) {
            return failResponse(res, "Passwords do not match", 400);
        }

        // --- Find User ---
        const user = await User.findOne({ email });
        if (!user) return failResponse(res, "User not found", 404);

        // --- Generate Secure Token ---
        const token = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        // --- Store Token + New Password Temporarily ---
        otpStore[email] = {
            resetToken: token,
            newPassword: password,
            expires: tokenExpiry,
        };

        user.passwordVerification = "pending";
        await user.save();

        // --- Destroy Session ---
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

        // --- Construct Reset Link ---
        const baseUrl = API_CONFIG.baseUrl || "http://localhost:5000";
        const resetLink = `${baseUrl}/api/auth/verify-reset/${token}?email=${encodeURIComponent(email)}`;

        // --- Prepare Email Template Data ---
        const data = {
            name: user.name || "User",
            resetLink,
        };

        // --- Generate Email HTML ---
        const html = generateEmailTemplate("passwordVerify", data);

        // --- Send Email ---
        await sendEmail({
            to: email,
            subject: "Verify Password Change",
            html,
            fromName: "Support Team",
        });

        // --- Success Response ---
        return successResponse(
            res,
            {},
            "Verification link sent to your email. Please check your inbox to complete the process."
        );

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
        if (req.file) updateFields.profile_image = req.file.location;

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



