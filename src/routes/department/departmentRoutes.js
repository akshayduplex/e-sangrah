import express from 'express';
import * as departmentController from '../../controllers/Department/departmentController.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Publicly exposed API routes
router.get('/', departmentController.getAllDepartments);
router.get('/search', departmentController.searchDepartments);
router.get('/:id', authenticate, departmentController.getDepartmentById);

// Admin-only routes (CRUD)
router.post('/', authenticate, authorize('admin'), departmentController.createDepartment);
router.patch('/:id', authenticate, authorize('admin'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('admin'), departmentController.deleteDepartment);

// Export router as default
export default router;
