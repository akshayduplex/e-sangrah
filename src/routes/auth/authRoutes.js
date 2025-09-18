import express from "express";
import * as authController from "../../controllers/Auth/authController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";

import {
    registerValidator,
    loginValidator,
    sendOtpValidator,
    verifyOtpValidator,
    resetPasswordValidator
} from "../../middlewares/validation/authValidators.js";
import upload from "../../middlewares/fileUploads.js";

const router = express.Router();

// ---------------------------
// Auth routes with validation
// ---------------------------
router.post("/register", registerValidator, authController.register);

router.post("/login", loginValidator, authController.login);

router.post("/send-otp", sendOtpValidator, validate, authController.sendOtp);

router.post("/verify-otp", verifyOtpValidator, validate, authController.verifyOtp);

router.post("/reset-password", resetPasswordValidator, validate, authController.resetPassword);
// In your routes file
router.post('/send-reset-link', authController.sendResetLink);
router.get('/verify-reset/:token', authController.verifyResetLink);

// ---------------------------
// Session-protected routes
// ---------------------------
router.get("/profile", authenticate, authController.getProfile);
router.patch("/edit-profile", authenticate, upload.single("profile_image"), authController.updateProfile);
router.post("/logout", authenticate, authController.logout);

export default router;
