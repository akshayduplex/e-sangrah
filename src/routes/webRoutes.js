import express from "express";
import mongoose from "mongoose";

// ===== Middlewares =====
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import checkPermissions from "../middlewares/checkPermission.js";

import * as AuthController from "../controllers/AuthController.js";
import * as AdminController from "../controllers/AdminController.js";
import * as EmployeeController from "../controllers/EmployeeController.js";
import * as UserController from "../controllers/UserController.js";
import * as DonorVendorController from "../controllers/DonerVenderController.js";
import * as DepartmentController from "../controllers/DepartmentController.js";
import * as DesignationController from "../controllers/DesignationController.js";
import * as DocumentController from "../controllers/DocumentController.js";
import * as ProjectController from "../controllers/ProjectController.js";
import * as PermissionController from "../controllers/PermisssionsController.js";
import * as FolderController from "../controllers/FolderController.js";
import * as NotificationController from "../controllers/NotificationController.js";
import * as DashboardController from "../controllers/DashboardController.js";
import * as ReportsController from "../controllers/ReportsController.js"

// ===== Validators =====

import {
    assignMenusValidator,
    getAssignedMenusValidator,
    getMenuListValidator,
    menuIdParamValidator,
} from "../middlewares/validation/permissionValidator.js";

// ===== Controllers =====
import {
    assignMenusToDesignation,
    getAddMenu,
    getAssignedMenus,
    getAssignMenuPage,
    getEditMenu,
    getMenuList,
} from "../controllers/PermisssionsController.js";

// ===== Models =====
import User from "../models/User.js";
import Department from "../models/Departments.js";
import Designation from "../models/Designation.js";
import UserPermission from "../models/UserPermission.js";
import Menu from "../models/Menu.js";

// ===== Utils & Constants =====
import { profile_type } from "../constant/Constant.js";
import { buildMenuTree } from "../utils/buildMenuTree.js";
import logger from "../utils/logger.js";

// ===== Router Initialization =====
const router = express.Router();

/* --- Home Route --- */

/* --- Authentication Pages --- */

// Login page
router.get("/login", AuthController.getLoginPage);

// Registration page
router.get("/register", AuthController.getRegisterPage);

// Forgot password page
router.get("/forgot-password", AuthController.getForgotPasswordPage);

// Reset password page
router.get("/reset-password", authenticate, AuthController.getResetPasswordPage);


/* --- User Management --- */

// User list page
router.get("/users/list", authenticate, checkPermissions, UserController.listUsers);

// Register new user form
router.get(
    "/users/register",
    authenticate,
    // authorize('admin', 'superadmin'),
    checkPermissions,
    UserController.showRegisterForm
);

// Combined view/edit user form
router.get("/users/:mode/:id", authenticate, checkPermissions, UserController.viewOrEditUser);

/* --- Donors --- */
// Donor registration page (create or edit)
router.get("/donors/register", authenticate, checkPermissions, DonorVendorController.showDonorForm);

// Donor list page
router.get("/donors/list", authenticate, checkPermissions, DonorVendorController.listDonors);

/* --- Vendors --- */
// Vendor registration page (create/edit)
router.get("/vendors/register", authenticate, checkPermissions, DonorVendorController.showVendorForm);

// Vendor list page
router.get("/vendors/list", authenticate, checkPermissions, DonorVendorController.listVendors);


/* =========================================
   DEPARTMENTS ROUTES
   ========================================= */
// Add Department page
router.get("/departments", authenticate, checkPermissions, DepartmentController.showAddDepartmentPage);

// Department List page
router.get("/departments/list", authenticate, checkPermissions, DepartmentController.showDepartmentListPage);

// Edit Department page
router.get("/departments/:id", authenticate, checkPermissions, DepartmentController.showEditDepartmentPage);


/* =========================================
   ADMIN ROUTE
   ========================================= */
router.get("/admin/dashboard", authenticate, checkPermissions, AdminController.showAdminDashboardPage);
router.get("/admin/approval", authenticate, checkPermissions, AdminController.showAdminApprovalPage);
router.get("/document/:id/admin/approval/track", authenticate, checkPermissions, AdminController.showApprovalTrackPage);
router.get("/documents/admin/recyclebin", authenticate, checkPermissions, AdminController.showRecycleBinPage);
router.get("/admin/folders/:folderId/manage-access", authenticate, AdminController.showManageAccessPage);
router.get("/admin/permissionslogs", authenticate, AdminController.showPermissionLogsPage);
router.get("/admin/folders/permission", authenticate, AdminController.showFolderPermissionLogsPage);
/* =========================================
   EMPLOYEE ROUTE
   ========================================= */
router.get("/employee/approval", authenticate, EmployeeController.showEmployeeApprovalPage);
router.get("/employee/dashboard", authenticate, EmployeeController.showEmployeeDashboardPage);
// router.get("/employee/track", authenticate, checkPermissions, EmployeeController.showEmployeeApprovalPage);
router.get("/documents/employee/recyclebin", authenticate, EmployeeController.showEmployeeRecycleBinPage);
//Approvals
// Render approval page
router.get('/document/:id/approval/track', authenticate, DocumentController.getDocumentApprovalsPage);

/* =========================================
   Reports ROUTES
   ========================================= */
// Add Designation page
router.get("/report", authenticate, ReportsController.showReportPage);


/* =========================================
   DESIGNATIONS ROUTES
   ========================================= */
// Add Designation pageauthori
router.get("/designations", authenticate, checkPermissions, DesignationController.showAddDesignationPage);

// Edit Designation page
router.get("/designations/edit/:id", authenticate, checkPermissions, DesignationController.showEditDesignationPage);

// Designation List page
router.get("/designations/list", authenticate, checkPermissions, DesignationController.showDesignationListPage);


/* =========================================
   DOCUMENTS ROUTES
   ========================================= */

// Document List page
router.get("/documents/list", authenticate, checkPermissions, DocumentController.showDocumentListPage);

// View Document page
router.get("/documents/:id/versions/view", authenticate, checkPermissions, DocumentController.showViewDocumentPage);
router.get("/documents/archived", authenticate, checkPermissions, DocumentController.showArchivedDocumentPage);


// Add Document page
router.get("/documents/add", authenticate, DocumentController.showAddDocumentPage);

// Edit Document page
router.get("/documents/edit/:id", authenticate, checkPermissions, DocumentController.showEditDocumentPage);
router.get('/documents/view/:token', authenticate, DocumentController.viewDocumentFiles);
router.get('/documents/approve-access/:token', authenticate, DocumentController.viewGrantAccessPage);

/* =========================================
   PROJECTS ROUTES
   ========================================= */
// Projects List page
router.get("/projects/list", authenticate, ProjectController.showProjectListPage);

// Project details (new)
router.get("/projects/details", authenticate, checkPermissions, ProjectController.showNewProjectDetails);

// Project details (existing)
router.get("/projects/:id/details", authenticate, checkPermissions, ProjectController.showExistingProjectDetails);

// Main Projects page
router.get("/projects", authenticate, checkPermissions, ProjectController.showMainProjectsPage);

/* =========================================
   PERMISSIONS ROUTES
   ========================================= */

// Assign Permissions page
router.get("/permissions/assign", authenticate, checkPermissions, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 }).lean();

        res.render("pages/permissions/assign-permissions", {
            user: req.user,
            Roles: profile_type,
            designations,
            departments,
            profile_type,
        });
    } catch (err) {
        logger.error("Assign permissions error:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load permissions page" });
    }
});

// Assign menus to designation
router.get("/permissions/assign-menu", authenticate, checkPermissions, getAssignMenuPage);
router.get("/permissions/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, getAssignedMenus);
router.post("/permissions/assign-menu/assign", authenticate, assignMenusValidator, assignMenusToDesignation);

// User Permissions page
router.get("/permissions/user/:id", authenticate, checkPermissions, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) {
            return res.status(404).render("pages/error", { user: req.user, message: "User not found" });
        }

        const menus = await Menu.find({ is_show: true }).sort({ priority: 1, add_date: -1 }).lean();
        const masterMenus = buildMenuTree(menus);

        const userPermissions = await UserPermission.find({ user_id: userId }).populate("menu_id").lean();
        const permissionMap = {};
        userPermissions.forEach((perm) => {
            if (perm.menu_id) {
                permissionMap[perm.menu_id._id.toString()] = perm.permissions;
            }
        });

        res.render("pages/permissions/assign-user-permissions", {
            user: req.user,
            targetUser: user,
            masterMenus,
            permissionMap,
        });
    } catch (err) {
        logger.error("Error loading user permissions:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load user permissions" });
    }
});

// Role Permissions Page
router.get("/permissions/roles", authenticate, checkPermissions, (req, res) => {
    res.render("pages/permissions/roles-permissions", { user: req.user });
});

// Menu Management
router.get("/permissions/menu/list", authenticate, checkPermissions, getMenuListValidator, getMenuList);
router.get("/permissions/menu/add", authenticate, checkPermissions, getAddMenu);
router.get("/permissions/menu/add/:id", authenticate, checkPermissions, menuIdParamValidator, getEditMenu);

// Save user permissions
router.post("/permissions/user/save", authenticate, checkPermissions, async (req, res) => {
    try {
        const { user_id, permissions } = req.body;
        const assigned_by = req.user;

        if (!user_id || !permissions || Object.keys(permissions).length === 0) {
            return res.status(400).json({ success: false, message: "User ID and permissions are required" });
        }

        await UserPermission.deleteMany({ user_id });

        const permissionDocs = [];
        for (const [menuId, permData] of Object.entries(permissions)) {
            permissionDocs.push({
                user_id,
                menu_id: menuId,
                permissions: {
                    read: !!permData.read,
                    write: !!permData.write,
                    delete: !!permData.delete,
                },
                assigned_by: {
                    user_id: assigned_by._id,
                    name: assigned_by.name,
                    email: assigned_by.email,
                },
            });
        }

        if (permissionDocs.length > 0) await UserPermission.insertMany(permissionDocs);

        res.json({ success: true, message: "User permissions saved successfully" });
    } catch (err) {
        logger.error("Error saving user permissions:", err);
        res.status(500).json({ success: false, message: "Error saving user permissions" });
    }
});

/* =========================================
   FOLDERS AND DOCUMENTS ROUTES
   ========================================= */
// Folder list by ID
router.get("/:folderId/list", authenticate, checkPermissions, FolderController.showFolderListById);

// Upload Folder page
router.get("/upload-folder", authenticate, FolderController.showUploadFolderPage);

// Archived Folders page
router.get("/archived", authenticate, checkPermissions, FolderController.showArchivedFoldersPage);

// Recycle-bin Folders page
router.get("/recyclebin", authenticate, checkPermissions, FolderController.showRecycleBinPage);

// Main Folders page
router.get("/folders", authenticate, FolderController.showMainFoldersPage);
router.get('/folders/view/:fileId', authenticate, FolderController.viewFile)
router.get("/folders/:accesslevel/:folderId", authenticate, FolderController.showviewFoldersPage);
/* =========================================
   NOTIFICATIONS ROUTE
   ========================================= */
// Notifications page
router.get("/notifications", authenticate, checkPermissions, NotificationController.showNotificationsPage);

/* =========================================
   MY PROFILE ROUTE
   ========================================= */
router.get("/my-profile", authenticate, AuthController.showMyProfile);


/* ===========================
   Role and Permmissions Assignment
=========================== */

// Assign Permissions page
router.get("/assign-permissions", authenticate, checkPermissions, PermissionController.showAssignPermissionsPage);

// Get user permissions page
router.get("/user-permissions/:id", authenticate, checkPermissions, PermissionController.showUserPermissionsPage);

// Get user permissions API
router.get("/user/:id/permissions", authenticate, checkPermissions, PermissionController.getUserPermissions);

// Save user permissions
router.post("/user/permissions", authenticate, checkPermissions, PermissionController.saveUserPermissions);


export default router;
