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

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Document routes
router.get("/", getDocuments);
router.get("/search", searchDocuments);
router.post("/", createDocument);
router.get("/:id", getDocument);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);
router.patch("/:id/status", updateDocumentStatus);
router.post("/:id/share", shareDocument);
router.get("/:id/audit-logs", getDocumentAuditLogs);
router.get("/:id/access-logs", getDocumentAccessLogs);

export default router;