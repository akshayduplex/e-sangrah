const express = require('express');
const router = express.Router();
const authController = require('../../controllers/Auth/authController');
const { authenticate } = require('../../middlewares/authMiddleware');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/direct-password", authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.post("/logout", authController.logout);
module.exports = router;
