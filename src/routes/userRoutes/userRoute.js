// import express from "express";
// import {
//     createUser,
//     getAllUsers,
//     getUserById,
//     updateUser,
//     deleteUser
// } from "../../controllers/userControllers/userController.js";

// const router = express.Router();

// // CRUD routes
// router.post("/register", createUser);        // Create a new user
// router.get("/", getAllUsers);       // Get all users
// router.get("/:id", getUserById);    // Get a single user by ID
// router.put("/:id", updateUser);     // Update user by ID
// router.delete("/:id", deleteUser);  // Delete user by ID

// export default router;
import express from "express";
import { body } from "express-validator";
import {
    registerUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../../controllers/userControllers/userController.js";
import { upload } from "../../middlewares/fileUploads.js";
const router = express.Router();

// Validation rules
const registrationValidation = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email"),
    body("raw_password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
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

const updateValidation = [
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

// Routes
router.post("/register", upload.single("profile_image"), registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateValidation, updateUser);
router.delete("/:id", deleteUser);

export default router;