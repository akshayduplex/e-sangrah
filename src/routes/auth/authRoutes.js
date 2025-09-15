import express from "express";
import * as authController from "../../controllers/Auth/authController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";

import {
    registerValidator,
    loginValidator,
    sendOtpValidator,
    verifyOtpValidator,
    resetPasswordValidator,
    changePasswordValidator
} from "../../middlewares/validation/authValidators.js";

const router = express.Router();

// ---------------------------
// Auth routes with validation
// ---------------------------
router.post("/register", registerValidator, authController.register);

router.post("/login", loginValidator, authController.login);

router.post("/send-otp", sendOtpValidator, validate, authController.sendOtp);

router.post("/verify-otp", verifyOtpValidator, validate, authController.verifyOtp);

router.post("/reset-password", resetPasswordValidator, validate, authController.resetPassword);

router.post("/direct-password", changePasswordValidator, validate, authController.changePassword);

// ---------------------------
// Session-protected routes
// ---------------------------
router.get("/me", authenticate, authController.getMe);

router.post("/logout", authenticate, authController.logout);

export default router;
