const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/Department/departmentController');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');

// Publicly exposed API routes
router.get('/', departmentController.getAllDepartments);
router.get('/:id', authenticate, departmentController.getDepartmentById);
router.get('/:id/storage', authenticate, departmentController.getDepartmentStorage);

// Admin-only routes (CRUD)
router.post('/', authenticate, authorize('Admin'), departmentController.createDepartment);
router.put('/:id', authenticate, authorize('Admin'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('Admin'), departmentController.deleteDepartment);

module.exports = router;
