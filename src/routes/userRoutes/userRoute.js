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
import { registrationValidation, updateValidation } from "../../middlewares/validation/userValidator.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
const router = express.Router();

router.use(authenticate);
// Routes
router.post("/register", registrationValidation, upload.single("profile_image"), registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateValidation, updateUser);
router.delete("/:id", deleteUser);

export default router;