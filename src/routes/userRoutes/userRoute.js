// export default router;
import express from "express";
import {
    registerUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../../controllers/userControllers/userController.js";
import upload from "../../middlewares/fileUploads.js";
import { registrationValidation, updateValidation } from "../../middlewares/validation/userValidator.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.js";
const router = express.Router();

router.use(authenticate);
// Routes
router.post("/register", upload.single("profile_image"), registerUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;