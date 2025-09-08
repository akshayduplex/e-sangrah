import express from "express";
import multer from "multer";
import * as documentController from "../../controllers/Document/documentController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Multer setup
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// Routes
router.get("/my-uploads", authenticate, documentController.getUserUploadedDocuments);
router.post("/", authenticate, upload.array("files", 10), documentController.createDocument);
router.patch("/:id/toggle", authenticate, documentController.toggleFields);
router.get("/recent", authenticate, documentController.getRecentDocuments);
router.get("/:id", authenticate, documentController.getDocumentById);
router.put("/:id", authenticate, documentController.updateDocument);
router.delete("/:id", authenticate, documentController.deleteDocument);
router.get("/:id/download", authenticate, documentController.downloadFile);

// Export router as default
export default router;
