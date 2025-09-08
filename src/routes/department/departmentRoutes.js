import express from 'express';
import * as departmentController from '../../controllers/Department/departmentController.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Publicly exposed API routes
router.get('/', departmentController.getAllDepartments);
router.get('/:id', authenticate, departmentController.getDepartmentById);
router.get('/:id/storage', authenticate, departmentController.getDepartmentStorage);

// Admin-only routes (CRUD)
router.post('/', authenticate, authorize('Admin'), departmentController.createDepartment);
router.put('/:id', authenticate, authorize('Admin'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('Admin'), departmentController.deleteDepartment);

// Export router as default
export default router;
