import express from "express";
import multer from "multer";
import {
    uploadFile,
    submitForm,
    deleteFile,
    getFileStatus,
    download,
} from "../controllers/tempFileController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Multer memory storage (for direct S3 upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {}, // 10MB
});

router.use(authenticate);

// Routes
router.post("/upload/:folderId", upload.array('file'), uploadFile);
router.get("/download/:fileName", download);
router.post("/submit-form", submitForm);
router.delete("/:fileId", deleteFile);
router.get("/:fileId/status", getFileStatus);

export default router;
