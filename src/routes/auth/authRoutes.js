import express from "express";
import * as authController from "../../controllers/Auth/authController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
import multer from 'multer';
import path from 'path';

import {
    registerValidator,
    loginValidator,
    sendOtpValidator,
    verifyOtpValidator,
    resetPasswordValidator,
    changePasswordValidator
} from "../../validators/auth.js";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profile-images/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});
const router = express.Router();

// ---------------------------
// Auth routes with validation
// ---------------------------
router.post("/register", authController.register);

router.post("/login", authController.login);

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
