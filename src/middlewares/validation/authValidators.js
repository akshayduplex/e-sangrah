import { body } from "express-validator";

export const registerValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),

    body("raw_password")
        .optional()
        .isLength({ min: 6 }).withMessage("Raw password must be at least 6 characters long"),

    body("profile_type")
        .optional()
        .isIn(["employee", "manager", "admin"]).withMessage("Invalid profile_type"),

    body("department").optional().isMongoId().withMessage("Invalid department ID"),
    body("position").optional().isString()
];

export const loginValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required")
];

export const changePasswordValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password too short"),
    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((val, { req }) => val === req.body.password).withMessage("Passwords do not match")
];

export const sendOtpValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email")
];

export const verifyOtpValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("otp").notEmpty().withMessage("OTP is required").isLength({ min: 4, max: 6 }).withMessage("Invalid OTP length")
];

export const resetPasswordValidator = [
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password too short"),
    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((val, { req }) => val === req.body.password).withMessage("Passwords do not match")
];
