import { body, param, query } from "express-validator";

// Create Project
export const createProjectValidator = [
    body("projectName")
        .notEmpty().withMessage("Project name is required")
        .isLength({ min: 3, max: 200 }).withMessage("Project name must be 3–200 characters"),

    body("projectCode")
        .notEmpty().withMessage("Project code is required")
        .isAlphanumeric().withMessage("Project code must be alphanumeric")
        .isLength({ max: 20 }).withMessage("Project code max length is 20"),

    body("projectDescription")
        .optional()
        .isLength({ max: 1000 }).withMessage("Description too long (max 1000 chars)"),

    body("department")
        .notEmpty().withMessage("Department is required")
        .isMongoId().withMessage("Invalid department ID"),

    body("projectManager")
        .notEmpty().withMessage("Project manager is required")
        .isMongoId().withMessage("Invalid project manager ID"),

    body("projectStartDate")
        .notEmpty().withMessage("Project start date is required")
        .isISO8601().withMessage("Invalid start date"),

    body("projectEndDate")
        .notEmpty().withMessage("Project end date is required")
        .isISO8601().withMessage("Invalid end date"),

    body("projectStatus")
        .optional()
        .isIn(["Planned", "Active", "OnHold", "Completed", "Cancelled"])
        .withMessage("Invalid project status"),

    body("priority")
        .optional()
        .isIn(["Low", "Medium", "High", "Critical"])
        .withMessage("Invalid priority"),

    body("tags")
        .optional()
        .isArray().withMessage("Tags must be an array of strings"),
    body("tags.*")
        .optional()
        .isString().withMessage("Each tag must be a string"),
];

// Update Project
export const updateProjectValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("projectName")
        .optional()
        .isLength({ min: 3, max: 200 }).withMessage("Project name must be 3–200 characters"),
    body("projectCode")
        .optional()
        .isAlphanumeric().withMessage("Project code must be alphanumeric")
        .isLength({ max: 20 }).withMessage("Project code max length is 20"),
    body("projectStatus")
        .optional()
        .isIn(["Planned", "Active", "OnHold", "Completed", "Cancelled"])
        .withMessage("Invalid project status"),
    body("priority")
        .optional()
        .isIn(["Low", "Medium", "High", "Critical"])
        .withMessage("Invalid priority"),
    body("tags")
        .optional()
        .isArray().withMessage("Tags must be an array of strings"),
];

// Donor validators (aligns with schema)
export const donorValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("name").notEmpty().withMessage("Donor name is required"),
    body("donor_id").notEmpty().isMongoId().withMessage("Invalid donor ID"),
];

// Vendor validators (aligns with schema)
export const vendorValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
    body("name").notEmpty().withMessage("Vendor name is required"),
    body("donor_id").notEmpty().isMongoId().withMessage("Invalid vendor ID"),
];

// Reset / Archive / Delete validators
export const projectIdValidator = [
    param("id").isMongoId().withMessage("Invalid project ID"),
];

// Search / Filter projects
export const searchProjectsValidator = [
    query("q").optional().isString().withMessage("Search query must be a string"),
    query("status").optional().isIn(["Planned", "Active", "OnHold", "Completed", "Cancelled"]),
    query("priority").optional().isIn(["Low", "Medium", "High", "Critical"]),
    query("department").optional().isMongoId().withMessage("Invalid department ID"),
    query("manager").optional().isMongoId().withMessage("Invalid manager ID"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1–100"),
    query("startDate").optional().isISO8601().withMessage("Invalid startDate"),
    query("endDate").optional().isISO8601().withMessage("Invalid endDate"),
];
