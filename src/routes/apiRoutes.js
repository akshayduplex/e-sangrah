// ---------------------------
// Core dependencies
// ---------------------------
import express from "express";

// ---------------------------
// Controller imports
// ---------------------------
import * as authController from "../controllers/authController.js";
import * as userController from "../controllers/userController.js";
import * as donorVendorController from "../controllers/DonerVender.js";
import * as departmentController from "../controllers/departmentController.js";
import * as designationController from "../controllers/designationController.js";
import * as documentController from "../controllers/documentController.js";
import * as projectController from "../controllers/projectController.js";
import * as permissionController from "../controllers/permisssions.js";
import * as folderController from "../controllers/folderController.js";
import * as notificationController from "../controllers/notificationController.js";
// import * as dashboardController from "../controllers/dashboardController.js";
import * as tempController from "../controllers/tempFileController.js";

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
import { registrationValidation, updateValidation } from "../middlewares/validation/userValidator.js";
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


const router = express.Router();


// ---------------------------
// Auth routes
// ---------------------------
router.post("/auth/register", registerValidator, authController.register);

router.post("/auth/login", loginValidator, authController.login);

router.post("/auth/send-otp", sendOtpValidator, validate, authController.sendOtp);

router.post("/auth/verify-otp", verifyOtpValidator, validate, authController.verifyOtp);

router.post("/auth/reset-password", resetPasswordValidator, validate, authController.resetPassword);
// In your routes file
router.post('/auth/send-reset-link', authController.sendResetLink);
router.get('/auth/verify-reset/:token', authController.verifyResetLink);


// Apply authentication to all routes
router.use(authenticate);

// ---------------------------
// Session-protected routes
// ---------------------------
router.get("/auth/profile", authenticate, authController.getProfile);
router.patch("/auth/edit-profile", authenticate, upload.single("profile_image"), authController.updateProfile);
router.post("/auth/logout", authenticate, authController.logout);



// ---------------------------
// Documents routes
// ---------------------------
router.get("/documents", documentController.getDocuments);
router.get("/documents/search", documentController.searchDocuments);
router.get("/documents/folder/:folderId", authenticate, documentController.getDocumentsByFolder);
// Only accept signature file
router.post("/documents", upload.fields([{ name: "signatureFile", maxCount: 1 }]), documentController.createDocument);
router.get("/documents/:id", documentController.getDocument);
router.patch("/documents/:id", upload.fields([{ name: "signature", maxCount: 1 }]), documentController.updateDocument);
router.delete("/documents/:id", documentController.deleteDocument);
router.patch("/documents/:id/status", documentController.updateDocumentStatus);
router.post("/documents/:id/share", documentController.shareDocument);
router.get("/documents/:id/audit-logs", documentController.getDocumentAuditLogs);
router.get("/documents/:id/access-logs", documentController.getDocumentAccessLogs);
// Invite a user to a document (sends email)
router.post("/documents/:documentId/invite", documentController.inviteUser);

//accept or reject an invite
router.get("/documents/:documentId/invite/:userId/accept", documentController.autoAcceptInvite);


// ---------------------------
// Departments routes
// ---------------------------
// Publicly exposed API routes
router.get('/departments', departmentController.getAllDepartments);
router.get('/departments/search', departmentController.searchDepartments);
router.get('/departments/:id', authenticate, departmentController.getDepartmentById);

// Admin-only routes (CRUD)
router.post('/departments', authenticate, authorize('admin', 'user'), checkPermissions, departmentController.createDepartment);
router.patch('/departments/:id', authenticate, authorize('admin', 'user'), checkPermissions, departmentController.updateDepartment);
router.delete('/departments/:id', authenticate, authorize('admin', 'user'), checkPermissions, departmentController.deleteDepartment);



// ---------------------------
// Designation routes
// ---------------------------
// Public API
router.get('/designations', designationController.getAllDesignations);
router.get('/designations/search', authenticate, designationController.searchDesignations)
router.get('/designations/:id', authenticate, designationController.getDesignationById);
// Admin-only CRUD
router.post('/designations', authenticate, authorize('admin'), designationController.createDesignation);
router.patch('/designations/:id', authenticate, authorize('admin'), designationController.updateDesignation);
router.delete('/designations/:id', authenticate, authorize('admin'), designationController.deleteDesignation);



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
        projectController.getAllProjects
    )
    .post(
        createProjectValidator,
        authorize('superadmin', 'admin', 'manager'), upload.single('projectLogo'), projectController.createProject);

router.route('/projects/:id/status')
    .patch(authorize('superadmin', 'admin', 'manager'), projectController.updateProjectStatus);
// Filtered project routes
router.route('/projects/status/:projectStatus')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), projectController.getProjectsByStatus);

router.route('/projects/department/:departmentId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), projectController.getProjectsByDepartment);

router.route('/projects/manager/:managerId')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), projectController.getProjectsByManager);

router.route('/projects/overdue')
    .get(authorize('superadmin', 'admin', 'manager'), projectController.getOverdueProjects);

router.route('/projects/upcoming-deadlines')
    .get(authorize('superadmin', 'admin', 'manager', 'employee'), projectController.getUpcomingDeadlines);

// Search route
router.route('/projects/search')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), searchProjectsValidator, projectController.searchProjects);

// Bulk operations
router.route('/projects/bulk/update')
    .patch(authorize('superadmin', 'admin'), projectController.bulkUpdateProjects);

// Export route
router.route('/projects/export')
    .get(authorize('superadmin', 'admin', 'manager'), projectController.exportProjects);

// Project timeline
router.route('/projects/:id/timeline')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), projectController.getProjectTimeline);

// Donor management routes
router.route('/projects/:id/donors')
    .post(authorize('superadmin', 'admin', 'manager'), projectController.addDonorToProject);

router.route('/projects/:id/donors/:donorId')
    .put(authorize('superadmin', 'admin', 'manager'), projectController.updateDonorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), projectController.removeDonorFromProject);

// Vendor management routes
router.route('/projects/:id/vendors')
    .post(donorValidator, authorize('superadmin', 'admin', 'manager'), vendorValidator, projectController.addVendorToProject);

router.route('/projects/:id/vendors/:vendorId')
    .put(authorize('superadmin', 'admin', 'manager'), projectController.updateVendorInProject)
    .delete(authorize('superadmin', 'admin', 'manager'), projectController.removeVendorFromProject);


router.route('/projects/:id/clone')
    .post(authorize('superadmin', 'admin', 'manager'), projectController.cloneProject);

router.route('/projects/:id/archive')
    .patch(authorize('superadmin', 'admin'), projectController.archiveProject);

// Single project operations
router.route('/projects/:id')
    .get(authorize('superadmin', 'admin', 'manager', 'employee', 'viewer'), projectController.getProject)
    .patch(authorize('superadmin', 'admin', 'manager'), upload.single('projectLogo'), projectController.updateProject)
    .delete(projectIdValidator, authorize('superadmin', 'admin'), projectController.deleteProject);
router.route('/projects/:id/restore')
    .patch(authorize('superadmin', 'admin'), projectController.restoreProject);



// ---------------------------
// Notifications routes
// ---------------------------

// CRUD endpoints
router.post("/notifications", notificationController.createNotification);
router.get("/notifications", notificationController.getUserNotifications);
router.get("/notifications/unread-count", notificationController.getUnreadCount);
router.patch("/notifications/:id/read", notificationController.markAsRead);
router.patch("/notifications/mark-all-read", notificationController.markAllAsRead);
router.delete("/notifications/:id", notificationController.deleteNotification);


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
router.delete("/assign-menu/unselect", authenticate, unAssignMenusValidator, permissionController.unAssignMenu)
// For logged-in user’s sidebar
router.get("/sidebar", authenticate, permissionController.getSidebarForUser);
// Get assigned menus for a designation
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, permissionController.getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusValidator, permissionController.assignMenusToDesignation);

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

router.post("/user/register", upload.single("profile_image"), userController.registerUser);
router.get("/user", userController.getAllUsers);
router.get("/user/search", userController.searchUsers);
router.get("/user/:id", userController.getUserById);
router.put("/user/:id", userController.updateUser);
router.delete("/user/:id", userController.deleteUser);


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
            uploadFile(req, res); // call your controller
        });
    } catch (err) {
        next(err);
    }
});
router.get("/files/download/:fileName", tempController.download);
router.post("/files/submit-form", tempController.submitForm);
router.delete("/files/:fileId", tempController.deleteFile);
router.get("/files/:fileId/status", tempController.getFileStatus);



// ---------------------------
// Folders routes
// ---------------------------
// Create folder
router.post('/folders', folderController.createFolder);

// List folders (optionally by parent)
router.get('/folders', folderController.listFolders);
router.get('/folders/all', folderController.getAllFolders);

// Get folder details with contents
router.get('/folders/details/:id', folderController.getFolder);

// router.get('', getFoldersProjectDepartment)

// Rename folder
router.patch('/folders/:id/rename', folderController.renameFolder);

// Move folder
router.patch('/folders/:id/move', folderController.moveFolder);

// Delete folder (soft delete)
router.delete('/folders/:id', folderController.deleteFolder);

// Upload files to folder
router.post('/folders/:folderId/upload', upload.array("files"), folderController.uploadToFolder);

// Get folder tree structure
router.get('/folders/tree/structure', folderController.getFolderTree);

router.patch('/folders/:id/archive', folderController.archiveFolder);
// Get all archived folders for the current user
router.get('/folders/archived', folderController.getArchivedFolders);

router.patch('/folders/:id/restore', folderController.restoreFolder);



// ---------------------------
// Donors and Vendors routes
// ---------------------------

// CRUD endpoints
router.post("/add-vendor-donor",
    upload.single('profile_image'),
    registerVendorOrDonor,
    donorVendorController.registerDonorVendor
);

router.post("/add-vendor",
    upload.single('profile_image'),
    registerVendor,
    donorVendorController.registerVendor
);


// get all donor base on the DataTable api (use POST for DataTables server-side)
router.post("/donors-list", donorVendorController.getAllDonors);
// get all vendors based on the DataTable api
router.post("/vendors-list", donorVendorController.getAllVendor);
// delete donor by id
router.delete("/donor-delete/:id", donorVendorController.deleteDonorVendor);


export default router;
