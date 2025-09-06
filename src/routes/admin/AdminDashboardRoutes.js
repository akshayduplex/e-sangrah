const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/Admin/adminDashboardController');
const { getDepartmentUploadStats } = require('../../controllers/userDashboardController');
const { authenticate } = require('../../middlewares/authMiddleware');


// Admin dashboard
router.get('/', authenticate, dashboardController.getDashboardStats);
router.get('/department-document-uploads', authenticate, dashboardController.getDocumentTypeUploads);
router.get('/department-documents', authenticate, dashboardController.getDocumentsSummary);
router.get("/department-document-uploads-type", authenticate, getDepartmentUploadStats);
module.exports = router;
