// ---------------------------
// Core dependencies
// ---------------------------
import express from "express";
import mongoose from "mongoose";
// ---------------------------
// Controller imports
// ---------------------------
import * as AuthController from "../controllers/AuthController.js";
import * as AdminController from "../controllers/AdminController.js";
import * as EmployeeController from "../controllers/EmployeeController.js";
import * as UserController from "../controllers/UserController.js";
import * as DonerVenderController from "../controllers/DonerVenderController.js";
import * as AdminDashboard from "../controllers/DashboardController.js"
import * as DepartmentController from "../controllers/DepartmentController.js";
import * as DesignationController from "../controllers/DesignationController.js";
import * as DocumentController from "../controllers/DocumentController.js";
import * as DocumentHandlerController from "../controllers/DocumentHandlerController.js";
import * as ProjectController from "../controllers/ProjectController.js";
import * as PermissionController from "../controllers/PermisssionsController.js";
import * as FolderController from "../controllers/FolderController.js";
import * as NotificationController from "../controllers/NotificationController.js";
import * as TempController from "../controllers/TempFileController.js";
import * as CommonController from "../controllers/CommonController.js"

// ---------------------------
// Middleware imports
// ---------------------------
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import checkPermissions from '../middlewares/checkPermission.js';
import upload from "../middlewares/fileUploads.js";
import { validate } from "../middlewares/validate.js";

// Validation middlewares
import {
    registerValidator,
    loginValidator,
    sendOtpValidator,
    verifyOtpValidator,
    resetPasswordValidator
} from "../middlewares/validation/authValidators.js";
import { createProjectValidator, donorValidator, projectIdValidator, searchProjectsValidator, vendorValidator } from '../middlewares/validation/projectValidator.js';
import { registerVendor, registerVendorOrDonor } from "../middlewares/validation/venderDonorValidation.js";
import { assignMenusValidator, getAssignedMenusValidator, unAssignMenusValidator } from "../middlewares/validation/permissionValidator.js";

// ---------------------------
// Model imports
// ---------------------------
import Menu from "../models/Menu.js";
import UserPermission from "../models/UserPermission.js";
import MenuAssignment from "../models/MenuAssignment.js";
import Folder from "../models/Folder.js";
import logger from "../utils/logger.js";
import Project from "../models/Project.js";
import UserFolderHistory from "../models/UserFolderHistory.js";

// ---------------------------
// Utils & middlewares imports
// ---------------------------

import { createS3Uploader, s3uploadfolder } from "../middlewares/multer-s3.js";
import { ParentFolderName } from "../middlewares/parentFolderName.js";

const router = express.Router();
// ---------------------------
// Auth routes
// ---------------------------
router.post("/auth/register", registerValidator, AuthController.register);

router.post("/auth/login", AuthController.login);
router.post("/auth/verify/token", AuthController.verifyTokenOtp);

router.post("/auth/send-otp", sendOtpValidator, validate, AuthController.sendOtp);

router.post("/auth/verify-otp", verifyOtpValidator, validate, AuthController.verifyOtp);

router.post("/auth/reset-password", resetPasswordValidator, validate, AuthController.resetPassword);
// In your routes file
router.post('/auth/send-reset-link', AuthController.sendResetLink);
router.get('/auth/verify-reset/:token', AuthController.verifyResetLink);


// Apply authentication to all routes
router.use(authenticate);

//encryption

router.get('/documents/download/:fileId/:token', authenticate, async (req, res) => {
    const { fileId, token } = req.params;

    // Check if token exists in session
    if (!req.session.fileTokens || req.session.fileTokens[fileId] !== token) {
        return res.status(403).send('Access Denied');
    }

    const file = await File.findById(fileId).exec();
    if (!file) return res.status(404).send('File not found');

    const decryptedUrl = decrypt(token);
    // For S3
    // res.redirect(decryptedUrl);
    // For local files:
    // res.sendFile(path.resolve(decryptedUrl));

    res.redirect(decryptedUrl); // S3 presigned URL
});

// ---------------------------
// Session-protected routes
// ---------------------------
router.get("/auth/profile", authenticate, AuthController.getProfile);
router.patch("/auth/edit-profile", authenticate, upload.single("profile_image"), AuthController.updateProfile);
router.post("/auth/logout", authenticate, AuthController.logout);


// ---------------------------
// Common routes
// ---------------------------
router.get('/file/pdf/:fileId', authenticate, CommonController.servePDF);
// Route to Download Folder
router.get("/download/:folderId", authenticate, CommonController.downloadFolderAsZip);
router.get("/download/file/:fileId", authenticate, CommonController.downloadFile);
router.post('/export', authenticate, CommonController.exportDocuments);
router.get('/export/formats', authenticate, CommonController.getExportFormats);


// ---------------------------
// Admin routes
// ---------------------------
router.get("/my-approvals", AdminController.getMyApprovals);
router.get("/dashboard/stats", AdminDashboard.getDashboardStats);
router.get("/dashboard/file-status", AdminDashboard.getFileStatus);
router.get("/dashboard/recent-activity", AdminDashboard.getRecentActivities);
router.get("/dashboard/uploads", AdminDashboard.getDepartmentDocumentUploads);
router.get("/dashboard/summary", AdminDashboard.getDocumentsStatusSummary);
// Permission Logs
router.get("/permission-logs", authorize('admin', 'superadmin'), AdminController.getPermissionLogs);
router.patch("/permission-logs/requestStatus", authorize('admin', 'superadmin'), AdminController.updateRequestStatus);
router.post("/permission-logs/grant-access", authorize('admin', 'superadmin'), AdminController.grantAccess)

// ---------------------------
// Employee routes
// ---------------------------
router.get("/approval-requests", EmployeeController.getApprovalRequests);



// ---------------------------
// Document Routes
// ---------------------------

/**
 * Document Management
 */
// List all documents
router.get("/documents", DocumentController.getDocuments);

// Get documents in a specific folder
router.get("/documents/folder/:folderId", authenticate, DocumentController.getDocumentsByFolder);

// Search documents
router.get("/documents/search", DocumentController.searchDocuments);

// Create a new document (only accepts signature file)
router.post(
    "/documents",
    upload.fields([{ name: "signatureFile", maxCount: 1 }]),
    DocumentController.createDocument
);

// Update a document (with optional signature update)
router.patch(
    "/documents/:id",
    upload.fields([{ name: "signature", maxCount: 1 }]),
    DocumentController.updateDocument
);

// Soft delete (move to recycle bin)
router.delete("/documents/:id", DocumentController.softDeleteDocument);

// Hard delete (permanent removal)
router.delete("/documents/permanent", DocumentController.deleteDocument);

// Update document status (hard delete or other status updates)
router.patch("/documents/:id/status", DocumentController.updateDocumentStatus);

// Archive and restore documents
router.patch("/documents/:id/archive", DocumentController.archiveDocuments);
router.get("/documents/archive", DocumentController.getArchivedDocuments);
router.patch("/documents/:id/restore", DocumentController.restoreDocument);

// Recycle bin
router.get("/documents/recyclebin", DocumentController.getRecycleBinDocuments);


/**
 * Document Sharing & Permissions
 */
// Share a document
router.patch("/documents/:id/share", authorize('admin', 'superadmin'), DocumentController.shareDocument);

// List all users a document is shared with
router.get("/documents/:documentId/shared-users", DocumentController.getSharedUsers);

// Done for updating the permission of all people with access
router.patch("/documents/:documentId/permissions", authorize('admin', 'superadmin'), DocumentController.bulkPermissionUpdate);

// Update user access level for a shared document
router.put("/documents/share/:documentId", authorize('admin', 'superadmin'), DocumentController.updateSharedUser);

// Remove user from shared list
router.delete("/documents/share/:documentId", authorize('admin', 'superadmin'), DocumentController.removeSharedUser);

// Invite a user to a document (sends email)
router.post("/documents/:documentId/invite", DocumentController.inviteUser);

// Accept or reject an invite automatically
router.get("/documents/:documentId/invite/:userId/auto-accept", DocumentController.autoAcceptInvite);

// Request access again
router.post("/documents/:documentId/request-access", DocumentController.requestAccessAgain);

// Grant access via token
router.post("/documents/grant-access/:token", authorize('admin', 'superadmin'), DocumentController.grantAccessViaToken);

// Generate shareable link for a document file
router.get('/documents/:documentId/:fileId/share-link', DocumentController.generateShareableLink)


/**
 * Audit & Logs
 */
// Get audit logs for a document
router.get("/documents/:id/audit-logs", DocumentController.getDocumentAuditLogs);

// Get access logs for a document
router.get("/documents/:id/access-logs", DocumentController.getDocumentAccessLogs);


/**
 * Document Versioning
 */
// Get version history
router.get('/documents/:id/versions/history', DocumentController.getVersionHistory);

// View a specific version
router.get('/documents/:id/versions/view', DocumentController.viewDocumentVersion);
router.get('/documents/:id/versions/:version/view', DocumentController.viewVersion);

// Restore a previous version
router.patch('/documents/:id/versions/:version/restore', DocumentController.restoreVersion);


/**
 * Document Approval Workflow
 */
// Create an approval request
router.post('/documents/:documentId/add', authenticate, DocumentController.createApprovalRequest);

// Track approvals
router.get('/documents/:documentId/approval/track', authenticate, DocumentController.getApprovals);

// Update approval status for a document
router.patch('/documents/:documentId/approvals/:approver', authenticate, DocumentController.updateApprovalStatus);


// ---------------------------
// Departments routes
// ---------------------------
// Publicly exposed API routes
router.get('/departments', authenticate, DepartmentController.getAllDepartments);
router.get('/departments/search', authenticate, DepartmentController.searchDepartments);
router.get('/departments/:id', authenticate, DepartmentController.getDepartmentById);

// Admin-only routes (CRUD)
router.post('/departments', authenticate, checkPermissions, DepartmentController.createDepartment);
router.patch('/departments/:id', authenticate, checkPermissions, DepartmentController.updateDepartment);
router.delete('/departments/:id', authenticate, checkPermissions, DepartmentController.deleteDepartment);


// ---------------------------
// DocumentHandler routes
// ---------------------------

// PATCH /shared/:sharedId/renew
router.patch("/shared/:sharedId/renew", authenticate, DocumentHandlerController.renewAccess);
// ---------------------------
// Designation routes
// ---------------------------
// Public API
router.get('/designations', authenticate, DesignationController.getAllDesignations);
router.get('/designations/search', authenticate, DesignationController.searchDesignations)
router.get('/designations/:id', authenticate, DesignationController.getDesignationById);
// Admin-only CRUD
router.post('/designations', authenticate, authorize('admin', 'superadmin'), DesignationController.createDesignation);
router.patch('/designations/:id', authenticate, authorize('admin', 'superadmin'), DesignationController.updateDesignation);
router.delete('/designations/:id', authenticate, authorize('admin', 'superadmin'), DesignationController.deleteDesignation);



// ---------------------------
// Projects routes
// ---------------------------

// Save selected project to session
router.post("/session/project", authenticate, async (req, res) => {
    const { projectId } = req.body;

    if (!projectId) return res.status(400).json({ error: "Project ID is required" });

    try {
        // Fetch project name from DB
        const project = await Project.findById(projectId).select("projectName");
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Save both ID and name in session
        req.session.selectedProject = projectId,
            req.session.selectedProjectName = project.projectName

        req.session.save(err => {
            if (err) return res.status(500).json({ error: "Failed to save session" });
            res.json({ success: true, selectedProject: req.session.selectedProject });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get selected project from session
router.get("/session/project", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                error: "Not logged in",
                selectedProject: null,
                selectedProjectName: null
            });
        }

        // Respond with session project data
        res.json({
            selectedProject: req.session.selectedProject || null,
            selectedProjectName: req.session.selectedProjectName || null
        });
    } catch (err) {
        console.error("Error in /session/project:", err);
        res.status(500).json({
            error: "Server error",
            selectedProject: null,
            selectedProjectName: null
        });
    }
});


// Basic CRUD routes
router.route('/projects')
    .get(
        ProjectController.getAllProjects
    )
    .post(
        createProjectValidator,
        authorize('superadmin', 'admin', 'manager'), upload.single('projectLogo'), ProjectController.createProject);

router.route('/projects/:id/status')
    .patch(authorize('superadmin', 'admin', 'manager'), ProjectController.updateProjectStatus);
// Filtered project routes
router.route('/projects/status/:projectStatus')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), ProjectController.getProjectsByStatus);

router.route('/projects/department/:departmentId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), ProjectController.getProjectsByDepartment);

router.route('/projects/manager/:managerId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), ProjectController.getProjectsByManager);

router.route('/projects/overdue')
    .get(authorize('superadmin', 'admin', 'manager'), ProjectController.getOverdueProjects);

router.route('/projects/upcoming-deadlines')
    .get(authorize('superadmin', 'admin', 'manager', 'employee'), ProjectController.getUpcomingDeadlines);

// Search route
router.route('/projects/search')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), searchProjectsValidator, ProjectController.searchProjects);

// Bulk operations
router.route('/projects/bulk/update')
    .patch(authorize('superadmin', 'admin'), ProjectController.bulkUpdateProjects);

// Export route
router.route('/projects/export')
    .get(authorize('superadmin', 'admin', 'manager'), ProjectController.exportProjects);

// Project timeline
router.route('/projects/:id/timeline')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), ProjectController.getProjectTimeline);

// Donor management routes
router.route('/projects/:id/donors')
    .post(authorize('superadmin', 'admin', 'manager'), ProjectController.addDonorToProject);

router.route('/projects/:id/donors/:donorId')
    .put(authorize('superadmin', 'admin', 'manager'), ProjectController.updateDonorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), ProjectController.removeDonorFromProject);

// Vendor management routes
router.route('/projects/:id/vendors')
    .post(donorValidator, authorize('superadmin', 'admin', 'manager'), vendorValidator, ProjectController.addVendorToProject);

router.route('/projects/:id/vendors/:vendorId')
    .put(authorize('superadmin', 'admin', 'manager'), ProjectController.updateVendorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), ProjectController.removeVendorFromProject);


router.route('/projects/:id/clone')
    .post(authorize('superadmin', 'admin', 'manager'), ProjectController.cloneProject);

router.route('/projects/:id/archive')
    .patch(authorize('superadmin', 'admin'), ProjectController.archiveProject);

// Single project operations
router.route('/projects/:id')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), ProjectController.getProject)
    .patch(authorize('superadmin', 'admin', 'manager'), upload.single('projectLogo'), ProjectController.updateProject)
    .delete(projectIdValidator, authorize('superadmin', 'admin'), ProjectController.deleteProject);
router.route('/projects/:id/restore')
    .patch(authorize('superadmin', 'admin'), ProjectController.restoreProject);



// ---------------------------
// Notifications routes
// ---------------------------

// CRUD endpoints
router.post("/notifications", NotificationController.createNotification);
router.get("/notifications", NotificationController.getUserNotifications);
router.get("/notifications/unread-count", NotificationController.getUnreadCount);
router.patch("/notifications/:id/read", NotificationController.markAsRead);
router.patch("/notifications/mark-all-read", NotificationController.markAllAsRead);
router.delete("/notifications/:id", NotificationController.deleteNotification);


// ---------------------------
// Permissions routes
// ---------------------------

// Get paginated menus
router.get("/menu", authenticate, async (req, res) => {
    try {
        // Check if limit=0 (get all records)
        if (req.query.limit === "0") {
            const menus = await Menu.find()
                .sort({ priority: 1, add_date: -1 })
                .populate("added_by updated_by", "name email")
                .lean();

            const total = await Menu.countDocuments();

            return res.json({
                success: true,
                data: menus,
                pagination: {
                    page: 1,
                    limit: 0,
                    total,
                    pages: 1
                }
            });
        }

        // Get page & limit from query, default to 1 and 10
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        // Fetch paginated menus
        const [menus, total] = await Promise.all([
            Menu.find()
                .sort({ priority: 1, add_date: -1 })
                .skip(skip)
                .limit(limit)
                .populate("added_by updated_by", "name email")
                .lean(),
            Menu.countDocuments()
        ]);

        // Send paginated response
        res.json({
            success: true,
            data: menus,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create menu
router.post("/menu", authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { type, master_id, name, icon_code, url, priority, is_show } = req.body;

        // Pre-validation
        if (type === "SubMenu" && !master_id) {
            return res.status(400).json({ success: false, message: "SubMenu requires a master_id" });
        }
        if (type === "Menu" && master_id) {
            return res.status(400).json({ success: false, message: "Menu cannot have a master_id" });
        }

        const menu = new Menu({
            type,
            master_id: master_id || null,
            name,
            icon_code: icon_code || "",
            url: url || "#",
            priority: Number(priority) || 1,
            is_show: !!is_show,
            added_by: {
                user_id: user._id,
                name: user.name,
                email: user.email
            },
            updated_by: {
                user_id: user._id,
                name: user.name,
                email: user.email
            }
        });

        await menu.save();
        res.json({ success: true, data: menu });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "URL must be unique" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error("Error creating menu:", error);
        res.status(500).json({ success: false, message: "Error creating menu" });
    }
});


// Update menu
router.put("/menu/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, master_id, name, icon_code, url, priority, is_show } = req.body;

        // Pre-validation
        if (type === "SubMenu" && !master_id) {
            return res.status(400).json({ success: false, message: "SubMenu requires a master_id" });
        }
        if (type === "Menu" && master_id) {
            return res.status(400).json({ success: false, message: "Menu cannot have a master_id" });
        }

        const menu = await Menu.findByIdAndUpdate(
            id,
            {
                type,
                master_id: master_id || null,
                name,
                icon_code,
                url,
                priority: Number(priority) || 1,
                is_show: !!is_show,
                updated_by: {
                    user_id: req.user._id,
                    name: req.user.name,
                    email: req.user.email
                }
            },
            { new: true, runValidators: true }
        );

        if (!menu) {
            return res.status(404).json({ success: false, message: "Menu not found" });
        }

        res.json({ success: true, data: menu });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "URL must be unique" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        logger.error("Error updating menu:", error);
        res.status(500).json({ success: false, message: "Error updating menu" });
    }
});


// Delete menu
router.delete("/menu/:id", authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid menu ID" });
        }

        const menu = await Menu.findByIdAndDelete(req.params.id);
        if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });

        await MenuAssignment.deleteMany({ menu_id: req.params.id });
        res.json({ success: true, message: "Menu deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get menus by type
router.get("/menu/type/:type", authenticate, async (req, res) => {
    try {
        const menus = await Menu.find({ type: req.params.type })
            .sort({ priority: 1, name: 1 })
            .lean();
        res.json({ success: true, data: menus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Toggle is_show status
router.patch("/menu/:id/toggle-status", authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await Menu.findById(id);
        if (!menu) {
            return res.status(404).json({ success: false, message: "Menu not found" });
        }

        const updated = await Menu.findByIdAndUpdate(
            id,
            {
                $set: {
                    is_show: !menu.is_show,
                    updated_by: req.user
                        ? {
                            user_id: req.user._id,
                            name: req.user.name,
                            email: req.user.email
                        }
                        : menu.updated_by
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: "Menu status updated successfully",
            data: { id: updated._id, is_show: updated.is_show }
        });
    } catch (error) {
        logger.error("Toggle menu status error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// ---------------------------
// Menu Assignment Endpoints
// ---------------------------

// Assign menus to a designation
router.post("/menu/assign", authenticate, async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!designation_id || !Array.isArray(menu_ids)) {
            return res.status(400).json({ success: false, message: "Designation ID and menu IDs array are required" });
        }

        if (!mongoose.Types.ObjectId.isValid(designation_id)) {
            return res.status(400).json({ success: false, message: "Invalid designation ID" });
        }

        for (const id of menu_ids) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: `Invalid menu ID: ${id}` });
            }
        }

        // Remove existing assignments
        await MenuAssignment.deleteMany({ designation_id });

        // Insert new assignments
        const assignments = menu_ids.map(menu_id => ({ designation_id, menu_id }));
        const savedAssignments = await MenuAssignment.insertMany(assignments);

        res.status(201).json({ success: true, data: savedAssignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete("/assign-menu/unselect", authenticate, unAssignMenusValidator, PermissionController.unAssignMenu)
// For logged-in user’s sidebar
router.get("/sidebar", authenticate, PermissionController.getSidebarForUser);
// Get assigned menus for a designation
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, PermissionController.getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusValidator, PermissionController.assignMenusToDesignation);

// Save user permissions
router.post("permisssions/user/permissions/:userId", authenticate, async (req, res) => {
    try {
        const { permissions } = req.body; // permissions = [{ menu_id, read, write, delete }]
        const userId = req.params.userId;

        for (const perm of permissions) {
            await UserPermission.findOneAndUpdate(
                { user_id: userId, menu_id: perm.menu_id },
                {
                    $set: {
                        permissions: {
                            read: perm.read || false,
                            write: perm.write || false,
                            delete: perm.delete || false
                        },
                        assigned_by: {
                            user_id: req.user._id,
                            name: req.user.name,
                            email: req.user.email
                        },
                        assigned_date: new Date()
                    }
                },
                { upsert: true, new: true }
            );
        }
        // Increment global permissions version to auto-refresh sessions
        // incrementGlobalPermissionsVersion(designation_id);
        res.json({ success: true, message: "Permissions assigned successfully." });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: "Failed to assign permissions." });
    }
});

router.get("/permissions/user/:id/permissions", async (req, res) => {
    try {
        const userPermissions = await UserPermission.find({ user_id: req.params.id })
            .populate("menu_id", "name type master_id")
            .lean();
        logger.log(userPermissions);
        res.json({ success: true, data: userPermissions });
    } catch (err) {
        logger.error("Error fetching user permissions:", err);
        res.status(500).json({ success: false, message: "Error fetching user permissions" });
    }
});

// Get user permissions

router.post("/user/register", upload.single("profile_image"), UserController.registerUser);
router.get("/user", UserController.getAllUsers);
router.get("/user/search", UserController.searchUsers);
router.get("/user/:id", UserController.getUserById);
router.put("/user/:id", UserController.updateUser);
router.delete("/user/:id", authorize('admin', 'superadmin'), UserController.deleteUser);


// ---------------------------
// TempFile routes
// ---------------------------

// ---------------------------
router.post("/tempfiles/upload/:folderId", async (req, res, next) => {
    try {
        const { folderId } = req.params;
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        // Dynamically create uploader for the selected folder
        const uploader = createS3Uploader(folder.name);
        uploader.array("file")(req, res, (err) => {
            if (err) return next(err);
            TempController.tempUploadFile(req, res); // call your controller
        });
    } catch (err) {
        next(err);
    }
});

router.post("/files/upload/:folderId", async (req, res, next) => {
    try {
        const { folderId } = req.params;
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        // Dynamically create uploader for the selected folder
        const uploader = createS3Uploader(folder.name);
        uploader.array("file")(req, res, (err) => {
            if (err) return next(err);
            TempController.uploadFile(req, res, folder); // call your controller
        });
    } catch (err) {
        next(err);
    }
});

// uploader to read folderName from body
router.post("/files/upload-folder/:folderId", ParentFolderName, s3uploadfolder.array('file'), async (req, res, next) => {
    try {
        const { folderId } = req.params;
        const parentfolder = await Folder.findById(folderId).select("name departmentId projectId ");

        if (!parentfolder)
            return res.status(404).json({ success: false, message: "Folder not found" });
        await TempController.handleFolderUpload(req, res, parentfolder);

    } catch (err) {
        next(err);
    }
});




router.get("/files/download/:fileName", TempController.download);
router.post("/files/submit-form", TempController.submitForm);
router.delete("/files/:fileId", TempController.deleteFile);
router.get("/files/:fileId/status", TempController.getFileStatus);


// ---------------------------
// Folder/Files Visted History
// ---------------------------


// Track folder visit
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.post('/session/track-folder-visit', async (req, res) => {
    try {
        let { folderId, projectId, departmentId } = req.body;

        if (!folderId || !isValidObjectId(folderId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid folder ID is required'
            });
        }

        // Convert IDs to ObjectId if valid
        folderId = new mongoose.Types.ObjectId(folderId);
        projectId = projectId && isValidObjectId(projectId) ? new mongoose.Types.ObjectId(projectId) : null;
        departmentId = departmentId && isValidObjectId(departmentId) ? new mongoose.Types.ObjectId(departmentId) : null;

        // Get folder details
        const folder = await Folder.findById(folderId);
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Use folder's projectId/departmentId if not provided
        projectId = projectId || (folder.projectId && isValidObjectId(folder.projectId) ? new mongoose.Types.ObjectId(folder.projectId) : null);
        departmentId = departmentId || (folder.departmentId && isValidObjectId(folder.departmentId) ? new mongoose.Types.ObjectId(folder.departmentId) : null);

        // Find or create session
        let session = await UserFolderHistory.findOne({ userId: req.user._id });
        if (!session) {
            session = new UserFolderHistory({
                userId: req.user._id,
                projectId,
                departmentId,
                recentFolders: []
            });
        }

        // Build folder path
        let path = folder.name;
        if (folder.ancestors && folder.ancestors.length > 0) {
            const ancestors = await Folder.find({
                _id: { $in: folder.ancestors.filter(isValidObjectId) }
            }).select('name');

            const ancestorNames = ancestors.map(a => a.name).join(' / ');
            path = `${ancestorNames} / ${folder.name}`;
        }

        // Add to recent folders safely
        await session.addRecentFolder({
            folderId,
            folderName: folder.name,
            projectId,
            departmentId,
            path
        });

        res.json({
            success: true,
            message: 'Folder visit tracked successfully'
        });

    } catch (error) {
        console.error('Error tracking folder visit:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get recent folders
router.get('/session/recent-folders', async (req, res) => {
    try {
        const userFolderHistory = await UserFolderHistory.findOne({ userId: req.user._id })
            .populate('recentFolders.projectId', 'projectName')
            .populate('recentFolders.departmentId', 'name');

        if (!userFolderHistory || !userFolderHistory.recentFolders.length) {
            return res.json({ success: true, recentFolders: [], lastVisitedFolder: null });
        }

        // Sort recent folders by visitedAt descending
        const folders = userFolderHistory.recentFolders
            .filter(f => f.folderId)
            .sort((a, b) => b.visitedAt - a.visitedAt)
            .slice(0, 5);

        const projectMap = {};

        folders.forEach(f => {
            const projectId = f.projectId?._id.toString() || 'no_project';
            if (!projectMap[projectId]) {
                projectMap[projectId] = {
                    projectId: f.projectId?._id,
                    projectName: f.projectId?.projectName || 'No Project',
                    folders: []
                };
            }

            // Build nested folder tree using path
            const pathParts = f.path ? f.path.split('/').map(p => p.trim()) : [f.folderName];
            let currentLevel = projectMap[projectId].folders;

            pathParts.forEach((name, index) => {
                let existing = currentLevel.find(c => c.folderName === name);
                if (!existing) {
                    existing = {
                        folderId: index === pathParts.length - 1 ? f.folderId : null,
                        folderName: name,
                        path: pathParts.slice(0, index + 1).join(' / '),
                        department: index === pathParts.length - 1 && f.departmentId ? {
                            departmentId: f.departmentId._id,
                            name: f.departmentId.name
                        } : null,
                        visitedAt: index === pathParts.length - 1 ? f.visitedAt : null,
                        children: []
                    };
                    currentLevel.push(existing);
                }
                currentLevel = existing.children;
            });
        });

        // Last visited folder
        const lastVisitedFolder = userFolderHistory.lastVisitedFolder?.folderId ? {
            folderId: userFolderHistory.lastVisitedFolder.folderId._id,
            folderName: userFolderHistory.lastVisitedFolder.folderName,
            path: userFolderHistory.lastVisitedFolder.path,
            project: userFolderHistory.lastVisitedFolder.projectId ? {
                projectId: userFolderHistory.lastVisitedFolder.projectId._id,
                projectName: userFolderHistory.lastVisitedFolder.projectId.projectName
            } : null,
            department: userFolderHistory.lastVisitedFolder.departmentId ? {
                departmentId: userFolderHistory.lastVisitedFolder.departmentId._id,
                name: userFolderHistory.lastVisitedFolder.departmentId.name
            } : null,
            visitedAt: userFolderHistory.lastVisitedFolder.visitedAt
        } : null;

        res.json({
            success: true,
            recentFolders: Object.values(projectMap),
            lastVisitedFolder
        });

    } catch (error) {
        console.error('Error fetching recent folders:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



// Clear recent folders
router.delete('/session/clear-recent-folders', async (req, res) => {
    try {
        await Session.findOneAndUpdate(
            { userId: req.user._id },
            {
                $set: {
                    recentFolders: [],
                    lastVisitedFolder: null
                }
            }
        );

        res.json({
            success: true,
            message: 'Recent folders cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing recent folders:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



// ---------------------------
// Folder Routes
// ---------------------------

/**
 * Folder Management
 */
// Create a new folder
router.post('/folders', FolderController.createFolder);
router.patch('/folderstatus/:folderId', FolderController.updateFolderStatus);

router.post('/folders/automatic', FolderController.automaticProjectDepartmentFolderCreate);
// List folders (optionally filter by parent)
router.get('/folders', FolderController.listFolders);
router.get('/folders/all', FolderController.getAllFolders);

// Get folder details along with its contents
router.get('/folders/details/:id', FolderController.getFolder);

// Rename a folder
router.patch('/folders/:id/rename', FolderController.renameFolder);

// Update Folder status

// Soft delete a folder
router.delete('/folders/:id', FolderController.deleteFolder);
router.delete('/folders/recyclebin/empty', FolderController.emptyRecycleBin);

// Archive a folder
router.patch('/folders/:id/archive', FolderController.archiveFolder);

// Restore an archived folder
router.patch('/folders/:id/restore', FolderController.restoreFolder);

// Get all RecycleBin folders for the current user
router.get('/folders/recyclebin', FolderController.getRecycleBinFolders);

// Get all archived folders for the current user
router.get('/folders/archived', FolderController.getArchivedFolders);

// Get folder tree structure
router.get('/folders/tree/structure', FolderController.getFolderTree);


/**
 * Folders Permissions Management
 */

// GET list
router.get("/folders/permissions", FolderController.getFolderPermissions);
router.get('/folders/:folderId/access', FolderController.getFolderAccessByEmail);
//  PATCH update
router.patch("/folders/permissions/:logId", FolderController.updateFolderLogPermission);

// DELETE remove
router.delete("/folders/permissions/:logId", FolderController.deleteFolderPermission);


/**
 * File Management within Folders
 */
// Upload files to a specific folder
router.post('/folders/:folderId/upload', upload.array("files"), FolderController.uploadToFolder);

// Download a specific file
router.get('/folders/download/:fileId', authenticate, FolderController.downloadFile);


/**
 * Folder Sharing & Permissions
 */
// Update folder permissions
router.patch('/update/folders/:id/permissions', FolderController.updateFolderPermission);

// Fetch users with access and folder share info
router.get('/folders/:folderId', FolderController.getFolderShareInfo);

// Invite user to folder
router.post('/folders/:folderId/share', FolderController.shareFolder);

// Request access to folder
router.post('/folders/:folderId/request-access', FolderController.requestFolderAccess);

// Grant access to a user
router.post('/folders/:folderId/grant-access', FolderController.grantFolderAccess);

// Get folder access permissions (for prefilling forms)
router.get('/folders/:folderId/access', FolderController.getFolderAccess);

// Remove user access
router.post('/folders/:folderId/unshare', FolderController.unshareFolder);

// Generate shareable link for a folder
router.post('/folders/:folderId/link', FolderController.generateShareLink);

// Access folder via shareable link
router.get('/folders/:folderId/access/:token', FolderController.accessViaToken);


// ---------------------------
// Donors and Vendors routes
// ---------------------------

// CRUD endpoints
router.post("/add-vendor-donor",
    upload.single('profile_image'),
    registerVendorOrDonor,
    DonerVenderController.registerDonorVendor
);

router.post("/add-vendor",
    upload.single('profile_image'),
    registerVendor,
    DonerVenderController.registerVendor
);


// get all donor base on the DataTable api (use POST for DataTables server-side)
router.post("/donors-list", DonerVenderController.getAllDonors);
// get all vendors based on the DataTable api
router.post("/vendors-list", DonerVenderController.getAllVendor);
// delete donor by id
router.delete("/donor-delete/:id", DonerVenderController.deleteDonorVendor);


export default router;
