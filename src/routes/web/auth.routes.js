import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Home
router.get("/", authenticate, (req, res) => {
    res.render("pages/temp", { title: "E-Sangrah - Home" });
});

// Login/Register/Forgot/Reset Password
router.get("/login", (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
});

router.get("/register", (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
});

router.get("/forgot-password", (req, res) => {
    res.render("pages/forgot-password", {
        otpSent: false,
        otpVerified: false,
        email: "",
        message: null,
        error: null,
    });
});

router.get("/reset-password", authenticate, (req, res) => {
    res.render("pages/reset-password", {
        otpSent: false,
        otpVerified: false,
        email: req.user.email,
        message: null,
        error: null,
    });
});

export default router;
