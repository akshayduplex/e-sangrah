import { body, param, query } from "express-validator";

export const updateRequestStatusValidator = [
    body("name")
        .notEmpty().withMessage("Project type name is required")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("priority")
        .optional()
        .isInt({ min: 1 }).withMessage("Priority must be a positive integer"),
    body("status")
        .optional()
        .isIn(["Active", "Inactive"]).withMessage("Status must be Active or Inactive"),
];
