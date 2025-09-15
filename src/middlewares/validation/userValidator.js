import { body } from "express-validator";

// Validation rules
export const registrationValidation = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email"),
    body("phone_number")
        .optional()
        .isMobilePhone()
        .withMessage("Please provide a valid phone number"),
    body("department")
        .optional()
        .isMongoId()
        .withMessage("Please provide a valid department ID"),
    body("designation_id")
        .optional()
        .isMongoId()
        .withMessage("Please provide a valid designation ID"),
];

export const updateValidation = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),
    body("phone_number")
        .optional()
        .isMobilePhone()
        .withMessage("Please provide a valid phone number"),
    body("department")
        .optional()
        .isMongoId()
        .withMessage("Please provide a valid department ID"),
    body("designation_id")
        .optional()
        .isMongoId()
        .withMessage("Please provide a valid designation ID"),
    body("status")
        .optional()
        .isIn(["Active", "Inactive", "Blocked"])
        .withMessage("Status must be Active, Inactive, or Blocked"),
];
