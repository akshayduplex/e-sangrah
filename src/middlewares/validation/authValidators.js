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
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),

    body("profile_type")
        .optional()
        .isIn(["donor", "vendor", "user", "admin", "superadmin"])
        .withMessage("Invalid profile_type"),

    // UserDetails (if employee-like user)
    body("userDetails.employee_id")
        .if(body("profile_type").equals("user"))
        .notEmpty().withMessage("Employee ID is required for user profile"),

    body("userDetails.department")
        .optional()
        .isMongoId().withMessage("Invalid department ID"),

    // VendorDetails
    body("vendorDetails.company_name")
        .if(body("profile_type").equals("vendor"))
        .notEmpty().withMessage("Company name is required for vendors"),

    body("vendorDetails.gst_number")
        .optional()
        .isString().withMessage("GST number must be a string"),

    // DonorDetails
    body("donorDetails.donor_type")
        .optional()
        .isIn(["individual", "corporate", "ngo"])
        .withMessage("Invalid donor type"),
];

export const loginValidator = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
];

export const changePasswordValidator = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((val, { req }) => val === req.body.password)
        .withMessage("Passwords do not match"),
];

export const sendOtpValidator = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email"),
];

export const verifyOtpValidator = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email"),
    body("otp")
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 4, max: 6 }).withMessage("Invalid OTP length"),
];

export const resetPasswordValidator = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password too short"),
    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((val, { req }) => val === req.body.password)
        .withMessage("Passwords do not match"),
];
