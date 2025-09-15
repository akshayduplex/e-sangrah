import { body, param, query } from "express-validator";

// Create Project
export const createProjectValidator = [
    body("projectName")
        .notEmpty().withMessage("Project name is required")
        .isLength({ min: 3 }).withMessage("Project name must be at least 3 characters"),

    body("projectCode")
        .notEmpty().withMessage("Project code is required")
        .isAlphanumeric().withMessage("Project code must be alphanumeric"),

    body("projectDescription")
        .optional()
        .isLength({ max: 500 }).withMessage("Description too long (max 500 chars)"),

    body("projectManager")
        .notEmpty().withMessage("Project manager is required")
        .isMongoId().withMessage("Invalid project manager ID"),

    body("startDate").notEmpty().withMessage("Start date is required").isISO8601().withMessage("Invalid start date"),
    body("endDate").optional().isISO8601().withMessage("Invalid end date"),

    body("budget").optional().isNumeric().withMessage("Budget must be a number"),

    body("status")
        .optional()
        .isIn(["planned", "ongoing", "completed", "on-hold", "archived"])
        .withMessage("Invalid status"),

    body("tags").optional().isArray().withMessage("Tags must be an array of strings"),
];

// Update Project
export const updateProjectValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("projectName").optional().isLength({ min: 3 }).withMessage("Project name must be at least 3 characters"),
    body("projectCode").optional().isAlphanumeric().withMessage("Project code must be alphanumeric"),
    body("budget").optional().isNumeric().withMessage("Budget must be a number"),
    body("status")
        .optional()
        .isIn(["planned", "ongoing", "completed", "on-hold", "archived"])
        .withMessage("Invalid status"),
];

// Donor/Vendor validators
export const donorValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("name").notEmpty().withMessage("Donor name is required"),
    body("email").optional().isEmail().withMessage("Invalid email"),
    body("amount").notEmpty().withMessage("Donation amount is required").isNumeric().withMessage("Amount must be a number"),
];

export const vendorValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("name").notEmpty().withMessage("Vendor name is required"),
    body("email").optional().isEmail().withMessage("Invalid email"),
    body("amount").optional().isNumeric().withMessage("Amount must be a number"),
];

// Reset / Archive / Delete validators
export const projectIdValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
];

// Search / Filter projects
export const searchProjectsValidator = [
    query("q").optional().isString().withMessage("Search query must be a string"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1-100"),
];
