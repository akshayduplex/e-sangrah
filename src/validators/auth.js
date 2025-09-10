// validators/auth.js
import { body } from "express-validator";

export const loginValidator = [
    body("email")
        .trim()
        .isEmail().withMessage("Invalid email format")
        .normalizeEmail(),
    body("password")
        .trim()
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
];
