import express from 'express';
import * as authController from '../../controllers/Auth/authController.js';
import { authenticate } from '../../middlewares/authMiddleware.js'; // renamed to ES module

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/direct-password", authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.post("/logout", authController.logout);

// Export router as default
export default router;
