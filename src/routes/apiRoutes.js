// ---------------------------
// Core dependencies
// ---------------------------
import express from "express";

// ---------------------------
// Controller imports
// ---------------------------
import * as AuthController from "../controllers/AuthController.js";
import * as AdminController from "../controllers/AdminController.js";
import * as EmployeeController from "../controllers/EmployeeController.js";
import * as UserController from "../controllers/UserController.js";
import * as DonerVenderController from "../controllers/DonerVenderController.js";
import * as DepartmentController from "../controllers/DepartmentController.js";
import * as DesignationController from "../controllers/DesignationController.js";
import * as DocumentController from "../controllers/DocumentController.js";
import * as DocumentHandlerController from "../controllers/DocumentHandlerController.js";
import * as ProjectController from "../controllers/ProjectController.js";
import * as PermissionController from "../controllers/PermisssionsController.js";
import * as FolderController from "../controllers/FolderController.js";
import * as NotificationController from "../controllers/NotificationController.js";
import * as TempController from "../controllers/TempFileController.js";

// ---------------------------
// Middleware imports
// ---------------------------
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import checkPermissions, { incrementGlobalPermissionsVersion } from '../middlewares/checkPermission.js';
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
import { createProjectValidator, donorValidator, projectIdValidator, searchProjectsValidator, updateProjectValidator, vendorValidator } from '../middlewares/validation/projectValidator.js';
import { registerVendor, registerVendorOrDonor } from "../middlewares/validation/venderDonorValidation.js";
import { assignMenusValidator, getAssignedMenusValidator, unAssignMenusValidator } from "../middlewares/validation/permissionValidator.js";

// ---------------------------
// Model imports
// ---------------------------
import Menu from "../models/Menu.js";
import DesignationMenu from "../models/menuAssignment.js";
import UserPermission from "../models/UserPermission.js";
import logger from "../utils/logger.js";
import { createS3Uploader } from "../middlewares/multer-s3.js";
import Folder from "../models/Folder.js";
import mongoose from "mongoose";
import { generateShareLink } from "../helper/GenerateUniquename.js";


const router = express.Router();


// ---------------------------
// Auth routes
// ---------------------------
router.post("/auth/register", registerValidator, AuthController.register);

router.post("/auth/login", AuthController.login);

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
// Admin routes
// ---------------------------
router.get("/my-approvals", AdminController.getMyApprovals);


// ---------------------------
// Employee routes
// ---------------------------
router.get("/approval-requests", EmployeeController.getApprovalRequests);



// ---------------------------
// Documents routes
// ---------------------------
router.get("/documents", DocumentController.getDocuments);
router.get("/documents/search", DocumentController.searchDocuments);
router.get("/documents/recyclebin", DocumentController.getRecycleBinDocuments);
router.patch("/documents/:id/archive", DocumentController.archiveDocuments);
router.get("/documents/archive", DocumentController.getArchivedDocuments);
router.delete("/documents/permanent", DocumentController.deleteDocument);
router.patch("/documents/:id/restore", DocumentController.restoreDocument);
router.get("/documents/folder/:folderId", authenticate, DocumentController.getDocumentsByFolder);
// Only accept signature file
router.post("/documents", upload.fields([{ name: "signatureFile", maxCount: 1 }]), DocumentController.createDocument);
// router.get("/documents/:id", DocumentController.getDocument);
router.patch("/documents/:id", upload.fields([{ name: "signature", maxCount: 1 }]), DocumentController.updateDocument);
// Soft delete (recycle bin)
router.delete("/documents/:id", DocumentController.softDeleteDocument);

// Hard delete (permanent removal)
router.patch("/documents/:id/status", DocumentController.updateDocumentStatus);

// List all users document is shared with
router.get("/documents/:documentId/shared-users", DocumentController.getSharedUsers);
// Update user access level
router.put("/documents/share/:documentId", DocumentController.updateSharedUser);

// Remove user from shared list
router.delete("/documents/share/:documentId", DocumentController.removeSharedUser);
router.patch("/documents/:id/share", DocumentController.shareDocument);
router.get("/documents/:id/audit-logs", DocumentController.getDocumentAuditLogs);
router.get("/documents/:id/access-logs", DocumentController.getDocumentAccessLogs);
// Invite a user to a document (sends email)
router.post("/documents/:documentId/invite", DocumentController.inviteUser);
router.post("/documents/:documentId/request-access-again", DocumentController.requestAccessAgain);
router.get("/documents/grant-access/:token", DocumentController.grantAccessViaToken);
//accept or reject an invite
router.get("/documents/:documentId/invite/:userId/auto-accept", DocumentController.autoAcceptInvite);

router.get('/documents/:documentId/:fileId/share-link', async (req, res) => {
    const { documentId, fileId } = req.params;
    console.log("sharelink", documentId, fileId)
    try {
        const link = generateShareLink(documentId, fileId);
        res.json({ success: true, link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to generate share link' });
    }
});

// versioning
router.get('/documents/:id/versions/history', DocumentController.getVersionHistory);
router.get('/documents/:id/versions/view', DocumentController.viewDocumentVersion);
router.get('/documents/:id/versions/:version/view', DocumentController.viewVersion);
// router.get('/documents/:id/versions/:version/download', DocumentController.download);
router.patch('/documents/:id/versions/:version/restore', DocumentController.restoreVersion);

//approval
// router.get('/:documentId', getDocumentApprovals);
router.patch('/documents/:documentId/approvals/:approver', DocumentController.updateApprovalStatus);
// Process approval action
router.post('/documents/:documentId/add', DocumentController.createApprovalRequest);
router.get('/documents/:documentId/approval/track', DocumentController.getApprovals);

// ---------------------------
// Departments routes
// ---------------------------
// Publicly exposed API routes
router.get('/departments', DepartmentController.getAllDepartments);
router.get('/departments/search', DepartmentController.searchDepartments);
router.get('/departments/:id', authenticate, DepartmentController.getDepartmentById);

// Admin-only routes (CRUD)
router.post('/departments', authenticate, authorize('admin', 'user'), checkPermissions, DepartmentController.createDepartment);
router.patch('/departments/:id', authenticate, authorize('admin', 'user'), checkPermissions, DepartmentController.updateDepartment);
router.delete('/departments/:id', authenticate, authorize('admin', 'user'), checkPermissions, DepartmentController.deleteDepartment);


// ---------------------------
// DocumentHandler routes
// ---------------------------

// PATCH /shared/:sharedId/renew
router.patch("/shared/:sharedId/renew", authenticate, DocumentHandlerController.renewAccess);
// ---------------------------
// Designation routes
// ---------------------------
// Public API
router.get('/designations', DesignationController.getAllDesignations);
router.get('/designations/search', authenticate, DesignationController.searchDesignations)
router.get('/designations/:id', authenticate, DesignationController.getDesignationById);
// Admin-only CRUD
router.post('/designations', authenticate, authorize('admin'), DesignationController.createDesignation);
router.patch('/designations/:id', authenticate, authorize('admin'), DesignationController.updateDesignation);
router.delete('/designations/:id', authenticate, authorize('admin'), DesignationController.deleteDesignation);



// ---------------------------
// Projects routes
// ---------------------------

// Save selected project to session
router.post("/session/project", (req, res) => {
    const { projectId } = req.body;

    if (!projectId) return res.status(400).json({ error: "Project ID is required" });

    req.session.selectedProject = projectId;

    req.session.save(err => {
        if (err) return res.status(500).json({ error: "Failed to save session" });
        res.json({ success: true, selectedProject: projectId });
    });
});

// Get selected project from session
router.get("/session/project", (req, res) => {
    res.json({ selectedProject: req.session.selectedProject || null });
});


// Basic CRUD routes
router.route('/projects')
    .get(
        authorize('superadmin', 'admin', 'manager', 'employee', 'viewer', "user"),
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

        await DesignationMenu.deleteMany({ menu_id: req.params.id });
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
        await DesignationMenu.deleteMany({ designation_id });

        // Insert new assignments
        const assignments = menu_ids.map(menu_id => ({ designation_id, menu_id }));
        const savedAssignments = await DesignationMenu.insertMany(assignments);

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
        incrementGlobalPermissionsVersion(designation_id);
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
router.delete("/user/:id", UserController.deleteUser);


// ---------------------------
// TempFile routes
// ---------------------------
router.post("/files/upload/:folderId", async (req, res, next) => {
    try {
        const { folderId } = req.params;
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        // Dynamically create uploader for the selected folder
        const uploader = createS3Uploader(folder.name);
        uploader.array("file")(req, res, (err) => {
            if (err) return next(err);
            TempController.uploadFile(req, res); // call your controller
        });
    } catch (err) {
        next(err);
    }
});
router.get("/files/download/:fileName", TempController.download);
router.post("/files/submit-form", TempController.submitForm);
router.delete("/files/:fileId", TempController.deleteFile);
router.get("/files/:fileId/status", TempController.getFileStatus);



// ---------------------------
// Folders routes
// ---------------------------
// Create folder
router.post('/folders', FolderController.createFolder);

// List folders (optionally by parent)
router.get('/folders', FolderController.listFolders);
router.get('/folders/all', FolderController.getAllFolders);

// Get folder details with contents
router.get('/folders/details/:id', FolderController.getFolder);

// router.get('', getFoldersProjectDepartment)

// Rename folder
router.patch('/folders/:id/rename', FolderController.renameFolder);

// Move folder
router.patch('/folders/:id/move', FolderController.moveFolder);

// Delete folder (soft delete)
router.delete('/folders/:id', FolderController.deleteFolder);

// Upload files to folder
router.post('/folders/:folderId/upload', upload.array("files"), FolderController.uploadToFolder);

// Get folder tree structure
router.get('/folders/tree/structure', FolderController.getFolderTree);

router.patch('/folders/:id/archive', FolderController.archiveFolder);
// Get all archived folders for the current user
router.get('/folders/archived', FolderController.getArchivedFolders);

router.patch('/folders/:id/restore', FolderController.restoreFolder);



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
