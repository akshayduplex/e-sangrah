import express from 'express';
import {
    getAllDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation
} from '../../controllers/Designation/designationController.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Public API
router.get('/', getAllDesignations);
router.get('/:id', authenticate, getDesignationById);

// Admin-only CRUD
router.post('/', authenticate, authorize('admin'), createDesignation);
router.patch('/:id', authenticate, authorize('admin'), updateDesignation);
router.delete('/:id', authenticate, authorize('admin'), deleteDesignation);

export default router;
