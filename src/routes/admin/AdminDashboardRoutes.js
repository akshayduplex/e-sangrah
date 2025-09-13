import express from 'express';
import * as dashboardController from '../../controllers/Admin/adminDashboardController.js';
import { getDepartmentUploadStats } from '../../controllers/Dashboard/userDashboardController.js';
import { authenticate } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Admin dashboard routes
router.get('/', authenticate, dashboardController.getDashboardStats);
router.get('/department-document-uploads', authenticate, dashboardController.getDocumentTypeUploads);
router.get('/department-documents', authenticate, dashboardController.getDocumentsSummary);
router.get("/department-document-uploads-type", authenticate, getDepartmentUploadStats);

// Export router as default
export default router;
