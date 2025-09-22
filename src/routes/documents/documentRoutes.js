// routes/documentRoutes.js
import express from "express";
import {
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    updateDocumentStatus,
    shareDocument,
    getDocumentAuditLogs,
    getDocumentAccessLogs,
    searchDocuments
} from "../../controllers/Document/documentController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import upload from "../../middlewares/fileUploads.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Document routes
router.get("/", getDocuments);
router.get("/search", searchDocuments);
router.post("/", upload.fields([{ name: "files", maxCount: 10 }, { name: "signature", maxCount: 1 }]), createDocument);
router.get("/:id", getDocument);
router.patch("/:id", upload.fields([{ name: "files", maxCount: 10 }, { name: "signature", maxCount: 1 }]), updateDocument);
router.delete("/:id", deleteDocument);
router.patch("/:id/status", updateDocumentStatus);
router.post("/:id/share", shareDocument);
router.get("/:id/audit-logs", getDocumentAuditLogs);
router.get("/:id/access-logs", getDocumentAccessLogs);

export default router;