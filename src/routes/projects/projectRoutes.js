import express from 'express';
import {
    // Basic CRUD operations
    getAllProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,

    getProjectsByStatus,
    getProjectsByDepartment,
    getProjectsByManager,
    getOverdueProjects,
    getUpcomingDeadlines,
    bulkUpdateProjects,
    exportProjects,
    cloneProject,
    archiveProject,
    restoreProject,
    updateProjectStatus,
    addDonorToProject,
    updateDonorInProject,
    removeDonorFromProject,
    addVendorToProject,
    updateVendorInProject,
    removeVendorFromProject,
    getProjectTimeline,
    searchProjects,
} from '../../controllers/Projects/projectController.js';
import { authenticate, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(authenticate);

// Basic CRUD routes
router.route('/')
    .get(
        authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'),
        getAllProjects
    )
    .post(authorize('superadmin', 'admin', 'manager'), createProject);


router.route('/:id/status')
    .patch(authorize('superadmin', 'admin', 'manager'), updateProjectStatus);
// Filtered project routes
router.route('/status/:projectStatus')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), getProjectsByStatus);

router.route('/department/:departmentId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), getProjectsByDepartment);

router.route('/manager/:managerId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), getProjectsByManager);

router.route('/overdue')
    .get(authorize('superadmin', 'admin', 'manager'), getOverdueProjects);

router.route('/upcoming-deadlines')
    .get(authorize('superadmin', 'admin', 'manager', 'employee'), getUpcomingDeadlines);

// Search route
router.route('/search')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), searchProjects);

// Bulk operations
router.route('/bulk/update')
    .patch(authorize('superadmin', 'admin'), bulkUpdateProjects);

// Export route
router.route('/export')
    .get(authorize('superadmin', 'admin', 'manager'), exportProjects);

// Project timeline
router.route('/:id/timeline')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), getProjectTimeline);

// Donor management routes
router.route('/:id/donors')
    .post(authorize('superadmin', 'admin', 'manager'), addDonorToProject);

router.route('/:id/donors/:donorId')
    .put(authorize('superadmin', 'admin', 'manager'), updateDonorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), removeDonorFromProject);

// Vendor management routes
router.route('/:id/vendors')
    .post(authorize('superadmin', 'admin', 'manager'), addVendorToProject);

router.route('/:id/vendors/:vendorId')
    .put(authorize('superadmin', 'admin', 'manager'), updateVendorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), removeVendorFromProject);


router.route('/:id/clone')
    .post(authorize('superadmin', 'admin', 'manager'), cloneProject);

router.route('/:id/archive')
    .patch(authorize('superadmin', 'admin'), archiveProject);

// Single project operations
router.route('/:id')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), getProject)
    .patch(authorize('superadmin', 'admin', 'manager'), updateProject)
    .delete(authorize('superadmin', 'admin'), deleteProject);
router.route('/:id/restore')
    .patch(authorize('superadmin', 'admin'), restoreProject);

export default router;