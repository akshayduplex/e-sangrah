import express from "express";
import mongoose from "mongoose";

// ===== Middlewares =====
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import checkPermissions from "../middlewares/checkPermission.js";

import * as authController from "../controllers/authController.js";
import * as adminController from "../controllers/adminController.js";
import * as employeeController from "../controllers/employeeController.js";
import * as userController from "../controllers/userController.js";
import * as donorVendorController from "../controllers/DonerVender.js";
import * as departmentController from "../controllers/departmentController.js";
import * as designationController from "../controllers/designationController.js";
import * as documentController from "../controllers/documentController.js";
import * as projectController from "../controllers/projectController.js";
import * as permissionController from "../controllers/permisssions.js";
import * as folderController from "../controllers/folderController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as dashboardController from "../controllers/dashboardController.js";

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
} from "../controllers/permisssions.js";

// ===== Models =====
import User from "../models/User.js";
import Department from "../models/Departments.js";
import Designation from "../models/Designation.js";
import UserPermission from "../models/UserPermission.js";
import Document from "../models/Document.js";
import Menu from "../models/Menu.js";

// ===== Utils & Constants =====
import { profile_type } from "../constant/constant.js";
import { buildMenuTree } from "../utils/buildMenuTree.js";
import { renderProjectDetails } from "../utils/renderProjectDetails.js";
import logger from "../utils/logger.js";

// ===== Router Initialization =====
const router = express.Router();

/* --- Home Route --- */

// Home Page
router.get("/", authenticate, (req, res) => {
    res.render("pages/temp", { title: "E-Sangrah - Home" });
});

/* --- Authentication Pages --- */

// Login page
router.get("/login", authController.getLoginPage);

// Registration page
router.get("/register", authController.getRegisterPage);

// Forgot password page
router.get("/forgot-password", authController.getForgotPasswordPage);

// Reset password page
router.get("/reset-password", authenticate, authController.getResetPasswordPage);


// router.use(checkPermissions); // Apply RBAC middleware to all routes below
/* --- User Management --- */

// User list page
router.get("/users/list", authenticate, checkPermissions, userController.listUsers);

// Register new user form
router.get(
    "/users/register",
    authenticate,
    authorize('admin', 'superadmin'),
    checkPermissions,
    userController.showRegisterForm
);

// Combined view/edit user form
router.get("/users/:mode/:id", authenticate, checkPermissions, userController.viewOrEditUser);

/* --- Donors --- */
// Donor registration page (create or edit)
router.get("/donors/register", authenticate, checkPermissions, donorVendorController.showDonorForm);

// Donor list page
router.get("/donors/list", authenticate, checkPermissions, donorVendorController.listDonors);

/* --- Vendors --- */
// Vendor registration page (create/edit)
router.get("/vendors/register", authenticate, checkPermissions, donorVendorController.showVendorForm);

// Vendor list page
router.get("/vendors/list", authenticate, checkPermissions, donorVendorController.listVendors);


/* =========================================
   DEPARTMENTS ROUTES
   ========================================= */
// Add Department page
router.get("/departments", authenticate, checkPermissions, departmentController.showAddDepartmentPage);

// Department List page
router.get("/departments/list", authenticate, checkPermissions, departmentController.showDepartmentListPage);

// Edit Department page
router.get("/departments/:id", authenticate, checkPermissions, departmentController.showEditDepartmentPage);


/* =========================================
   ADMIN ROUTE
   ========================================= */
router.get("/admin/approval", authenticate, checkPermissions, adminController.showAdminApprovalPage);
router.get("/document/:id/admin/approval/track", authenticate, checkPermissions, adminController.showApprovalTrackPage);

/* =========================================
   EMPLOYEE ROUTE
   ========================================= */
router.get("/employee/approval", authenticate, checkPermissions, employeeController.showEmployeeApprovalPage);
// router.get("/employee/track", authenticate, checkPermissions, employeeController.showEmployeeApprovalPage);
//Approvals
// Render approval page
router.get('/document/:id/approval/track', authenticate, documentController.getDocumentApprovalsPage);
/* =========================================
   DESIGNATIONS ROUTES
   ========================================= */
// Add Designation page
router.get("/designations", authenticate, authorize("admin"), checkPermissions, designationController.showAddDesignationPage);

// Edit Designation page
router.get("/designations/edit/:id", authenticate, authorize("admin"), checkPermissions, designationController.showEditDesignationPage);

// Designation List page
router.get("/designations/list", authenticate, authorize("admin"), checkPermissions, designationController.showDesignationListPage);


/* =========================================
   DOCUMENTS ROUTES
   ========================================= */

// Document List page
router.get("/documents/list", authenticate, checkPermissions, documentController.showDocumentListPage);

// View Document page
router.get("/documents/:id/versions/view", authenticate, checkPermissions, documentController.showViewDocumentPage);

// Add Document page
router.get("/documents/add", authenticate, checkPermissions, documentController.showAddDocumentPage);

// Edit Document page
router.get("/documents/edit/:id", authenticate, checkPermissions, documentController.showEditDocumentPage);


/* =========================================
   PROJECTS ROUTES
   ========================================= */
// Projects List page
router.get("/projects/list", authenticate, projectController.showProjectListPage);

// Project details (new)
router.get("/projects/details", authenticate, checkPermissions, projectController.showNewProjectDetails);

// Project details (existing)
router.get("/projects/:id/details", authenticate, checkPermissions, projectController.showExistingProjectDetails);

// Main Projects page
router.get("/projects", authenticate, checkPermissions, projectController.showMainProjectsPage);

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
   DASHBOARD ROUTE
   ========================================= */
router.get("/dashboard", authenticate, checkPermissions, dashboardController.showDashboard);

/* =========================================
   FOLDERS AND DOCUMENTS ROUTES
   ========================================= */
// Folder list by ID
router.get("/:folderId/list", authenticate, checkPermissions, folderController.showFolderListById);

// Upload Folder page
router.get("/upload-folder", authenticate, checkPermissions, folderController.showUploadFolderPage);

// Archived Folders page
router.get("/archived", authenticate, checkPermissions, folderController.showArchivedFoldersPage);

// Recycle-bin Folders page
router.get("/recyclebin", authenticate, checkPermissions, folderController.showRecycleBinPage);

// Main Folders page
router.get("/folders", authenticate, checkPermissions, folderController.showMainFoldersPage);

/* =========================================
   NOTIFICATIONS ROUTE
   ========================================= */
// Notifications page
router.get("/notifications", authenticate, checkPermissions, notificationController.showNotificationsPage);

/* =========================================
   MY PROFILE ROUTE
   ========================================= */
router.get("/my-profile", authenticate, checkPermissions, authController.showMyProfile);


/* ===========================
   Role and Permmissions Assignment
=========================== */

// Assign Permissions page
router.get("/assign-permissions", authenticate, checkPermissions, permissionController.showAssignPermissionsPage);

// Get user permissions page
router.get("/user-permissions/:id", authenticate, checkPermissions, permissionController.showUserPermissionsPage);

// Get user permissions API
router.get("/user/:id/permissions", authenticate, checkPermissions, permissionController.getUserPermissions);

// Save user permissions
router.post("/user/permissions", authenticate, checkPermissions, permissionController.saveUserPermissions);


export default router;
