import express from 'express';
import * as departmentController from '../../controllers/Department/departmentController.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Publicly exposed API routes
router.get('/', departmentController.getAllDepartments);
router.get('/:id', authenticate, departmentController.getDepartmentById);

// Commented out: requires schema update to support storage
// router.get('/:id/storage', authenticate, departmentController.getDepartmentStorage);

// Admin-only routes (CRUD)
router.post('/', authenticate, authorize('admin'), departmentController.createDepartment);
router.put('/:id', authenticate, authorize('admin'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('a    dmin'), departmentController.deleteDepartment);

// Export router as default
export default router;
