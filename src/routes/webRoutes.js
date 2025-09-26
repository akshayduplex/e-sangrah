import express from "express";
import mongoose from "mongoose";

// ===== Middlewares =====
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import checkPermissions from "../middlewares/checkPermission.js";
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
router.get("/login", (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
});

// Registration page
router.get("/register", (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
});

// Forgot password page
router.get("/forgot-password", (req, res) => {
    res.render("pages/forgot-password", {
        otpSent: false,
        otpVerified: false,
        email: "",
        message: null,
        error: null,
    });
});

// Reset password page
router.get("/reset-password", authenticate, (req, res) => {
    res.render("pages/reset-password", {
        otpSent: false,
        otpVerified: false,
        email: req.user.email,
        message: null,
        error: null,
    });
});

/* --- User Management --- */

// User list page
router.get("/users/list", authenticate, checkPermissions, (req, res) => {
    res.render("pages/registerations/user-listing", { title: "E-Sangrah - Users-List", user: req.user });
});

// Register new user form
router.get("/users/register", authenticate, checkPermissions, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 }).lean();

        res.render("pages/registerations/user-registration", {
            title: "E-Sangrah - Register",
            departments,
            designations,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading user registration:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Combined view/edit user form
router.get("/users/:mode/:id", authenticate, checkPermissions, async (req, res) => {
    try {
        const { mode, id } = req.params;

        const user = await User.findById(id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        if (!user) return res.status(404).send("User not found");

        // Always send departments and designations for edit mode
        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        res.render("pages/registerations/user-form", {
            title: `User - ${user.name}`,
            user,
            departments,
            designations,
            viewOnly: mode === "view"
        });
    } catch (err) {
        logger.error(err);
        res.status(500).send("Internal Server Error");
    }
});

/* --- Donors --- */
// Donor registration page (create or edit)
router.get("/donors/register", authenticate, checkPermissions, async (req, res) => {
    try {
        const donor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/registerations/donor-registration", {
            title: donor ? "E-Sangrah - Edit Donor" : "E-Sangrah - Register",
            donor,
            isEdit: Boolean(donor),
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading donor register page:", err);
        res.render("pages/registerations/donor-registration", { title: "E-Sangrah - Register", donor: null, isEdit: false, user: req.user });
    }
});

// Donor list page
router.get("/donors/list", authenticate, checkPermissions, async (req, res) => {
    try {
        const donors = await User.find({ profile_type: "donor" }).lean();
        res.render("pages/registerations/donor-listing", { title: "E-Sangrah - Donor List", donors, user: req.user });
    } catch (err) {
        logger.error("Error fetching donor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load donor list" });
    }
});

/* --- Vendors --- */
// Vendor registration page (create/edit)
router.get("/vendors/register", authenticate, checkPermissions, async (req, res) => {
    try {
        const vendor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/registerations/vendor-registration", {
            title: vendor ? "E-Sangrah - Edit Vendor" : "E-Sangrah - Register",
            vendor,
            isEdit: Boolean(vendor),
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading vendor register page:", err);
        res.render("pages/registerations/vendor-registration", { title: "E-Sangrah - Register", vendor: null, isEdit: false, user: req.user });
    }
});

// Vendor list page
router.get("/vendors/list", authenticate, checkPermissions, async (req, res) => {
    try {
        const vendors = await User.find({ profile_type: "vendor" }).lean();
        res.render("pages/registerations/vendor-registration-list", { title: "E-Sangrah - Vendor List", vendors, user: req.user });
    } catch (err) {
        logger.error("Error fetching vendor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load vendor list" });
    }
});

/* =========================================
   DEPARTMENTS ROUTES
   ========================================= */

// Render Add Department page
router.get("/departments", authenticate, checkPermissions, (req, res) => {
    res.render("pages/department/department", {
        title: "E-Sangrah - Department",
        user: req.user,
        department: null,
    });
});

// Department List page
router.get("/departments/list", authenticate, checkPermissions, (req, res) => {
    res.render("pages/department/departments-list", {
        title: "E-Sangrah - Departments-List",
        user: req.user
    });
});

// Edit Department page
router.get("/departments/edit/:id", authenticate, checkPermissions, async (req, res) => {
    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.redirect("/departments/list");

    res.render("pages/department/department", {
        title: "E-Sangrah - Edit Department",
        department,
        user: req.user
    });
});

/* =========================================
   DESIGNATIONS ROUTES
   ========================================= */

// Render Add Designation page
router.get("/designations", authenticate, authorize("admin"), checkPermissions, (req, res) => {
    res.render("pages/designation/designation", { designation: null, user: req.user });
});

// Edit Designation page
router.get("/designations/edit/:id", authenticate, authorize("admin"), checkPermissions, async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);
        if (!designation) {
            req.flash("error", "Designation not found");
            return res.redirect("/designations/list");
        }
        res.render("pages/designation/designation", { designation, user: req.user });
    } catch (err) {
        logger.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/designations/list");
    }
});

// Designation List page
router.get("/designations/list", authenticate, authorize("admin"), checkPermissions, (req, res) => {
    res.render("pages/designation/designations-list", { title: "Designation List", user: req.user });
});

/* =========================================
   DOCUMENTS ROUTES
   ========================================= */

// Document List page
router.get("/documents/list", authenticate, checkPermissions, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/document/document-list", {
            title: "E-Sangrah - Documents-List",
            designations,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading document list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load documents",
        });
    }
});


// Add Document page
router.get("/documents/add", authenticate, checkPermissions, async (req, res) => {
    try {
        res.render("pages/document/add-document", {
            title: "E-Sangrah - Add-Document",
            user: req.user,
            isEdit: false
        });
    } catch (err) {
        logger.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
});

// Edit Document page
router.get("/documents/edit/:id", authenticate, checkPermissions, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid document ID");
        }

        const document = await Document.findById(id)
            .populate("department", "name")
            .populate("project", "projectName")
            .populate("owner", "name email")
            .lean();

        if (!document) {
            return res.status(404).send("Document not found");
        }

        res.render("pages/add-document", {
            title: "E-Sangrah - Edit Document",
            user: req.user,
            document,
            isEdit: true,
            projectManager: document.projectManager, // send explicitly
            department: document.department // send explicitly
        });
    } catch (err) {
        logger.error("Error loading edit-document page:", err);
        res.status(500).send("Server Error");
    }
});

/* =========================================
   PROJECTS ROUTES
   ========================================= */

// Projects List page
router.get("/projects/list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/projects/projectList", {
            title: "E-Sangrah - Projects List",
            designations,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading project list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load project list"
        });
    }
});

// Project details (new)
router.get("/projects/details", authenticate, checkPermissions, async (req, res) => {
    await renderProjectDetails(res, null, req.user);
});

// Project details (existing)
router.get("/projects/:id/details", authenticate, checkPermissions, async (req, res) => {
    await renderProjectDetails(res, req.params.id, req.user);
});

// Main Projects page
router.get("/projects", authenticate, checkPermissions, async (req, res) => {
    try {
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - Project List",
            messages: req.flash(),
        });
    } catch (err) {
        logger.error("Error loading projects page:", err);
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - Project List",
            messages: { error: "Unable to load projects" },
            projects: [],
        });
    }
});

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

// Get user permissions
// router.get("/permissions/user/:id/permissions", authenticate, checkPermissions, async (req, res) => {
//     try {
//         const userPermissions = await UserPermission.find({ user_id: req.params.id })
//             .populate("menu_id", "name type master_id")
//             .lean();
//         res.json({ success: true, data: userPermissions });
//     } catch (err) {
//         logger.error("Error fetching user permissions:", err);
//         res.status(500).json({ success: false, message: "Error fetching user permissions" });
//     }
// });

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

// Role Permissions Page
router.get("/permissions/roles", authenticate, checkPermissions, (req, res) => {
    res.render("pages/permissions/roles-permissions", { user: req.user });
});

// Menu Management
router.get("/permissions/menu/list", authenticate, getMenuListValidator, getMenuList);
router.get("/permissions/menu/add", authenticate, checkPermissions, getAddMenu);
router.get("/permissions/menu/add/:id", authenticate, checkPermissions, menuIdParamValidator, getEditMenu);

/* =========================================
   DASHBOARD ROUTE
   ========================================= */
router.get("/dashboard", authenticate, checkPermissions, (req, res) => {
    try {
        res.render("pages/dashboard/dashboard", { user: req.user });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load dashboard" });
    }
});

/* =========================================
   FOLDERS AND DOCUMENTS ROUTES
   ========================================= */

// Folder list by ID
router.get("/:folderId/list", authenticate, async (req, res) => {
    try {
        const { folderId } = req.params;
        res.render("pages/document/documentFolderList", {
            title: "E-Sangrah - Documents-List",
            user: req.user,
            folderId
        });
    } catch (err) {
        logger.error("Error loading document list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load documents",
        });
    }
});

// Upload Folder page
router.get("/upload-folder", authenticate, checkPermissions, (req, res) => {
    res.render("pages/folders/upload-folder", { title: "E-Sangrah - Upload-Folder", user: req.user });
});

// Archived Folders page
router.get("/archived", authenticate, checkPermissions, (req, res) => {
    res.render("pages/folders/archivedFolders", { title: "E-Sangrah - ArchivedFolders", user: req.user });
});

// Main Folders page
router.get("/folders", authenticate, checkPermissions, (req, res) => {
    res.render("pages/folders/folders", { title: "E-Sangrah - Folders", user: req.user });
});

/* =========================================
   NOTIFICATIONS ROUTE
   ========================================= */
router.get("/notifications", authenticate, (req, res) => {
    res.render("pages/notifications", { title: "E-Sangrah - Notifications", user: req.user });
});

/* =========================================
   MY PROFILE ROUTE
   ========================================= */
router.get("/my-profile", authenticate, checkPermissions, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) return res.status(404).send("User not found");
        res.render("pages/myprofile", { user });
    } catch (err) {
        logger.error("Error loading profile:", err);
        res.status(500).send("Server Error");
    }
});


/* ===========================
   Role and Permmissions Assignment
=========================== */
// Render assign-permissions page
router.get("/assign-permissions", authenticate, checkPermissions, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();
        res.render("pages/permissions/assign-permissions", {
            user: req.user,
            Roles: profile_type,
            designations,
            departments,
            profile_type
        });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});

// Get user permissions page
router.get("/user-permissions/:id", authenticate, checkPermissions, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) {
            return res.status(404).render("pages/error", {
                user: req.user,
                message: "User not found",
            });
        }

        // Get all menus
        const menus = await Menu.find({ is_show: true })
            .sort({ priority: 1, add_date: -1 })
            .lean();

        // Build menu tree
        const masterMenus = buildMenuTree(menus);

        // Get user's existing permissions
        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id")
            .lean();

        // Create a map of menu permissions for easy access
        const permissionMap = {};
        userPermissions.forEach(perm => {
            if (perm.menu_id) {
                permissionMap[perm.menu_id._id.toString()] = perm.permissions;
            } else {
                logger.warn(`Missing menu for permission ID: ${perm._id}`);
            }
        });

        res.render("pages/permissions/assign-user-permissions", {
            user: req.user,
            targetUser: user,
            masterMenus,
            permissionMap
        });
    } catch (err) {
        logger.error("Error loading user permissions page:", err);
        res.status(500).render("error", {
            user: req.user,
            message: "Something went wrong while loading user permissions",
        });
    }
});

// Get user permissions API
router.get("/user/:id/permissions", authenticate, checkPermissions, async (req, res) => {
    try {
        const userId = req.params.id;
        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id", "name type master_id")
            .lean();

        res.json({ success: true, data: userPermissions });
    } catch (error) {
        logger.error("Error fetching user permissions:", error);
        res.status(500).json({ success: false, message: "Error fetching user permissions" });
    }
});

// Save user permissions
router.post("/user/permissions", authenticate, checkPermissions, async (req, res) => {
    try {
        const { user_id, permissions } = req.body; // permissions now only contains checked menus/submenus
        const assigned_by = req.user;

        if (!user_id || !permissions || Object.keys(permissions).length === 0) {
            return res.status(400).json({
                success: false,
                message: "User ID and permissions are required"
            });
        }

        // Delete existing permissions for the user
        await UserPermission.deleteMany({ user_id });

        // Prepare new permission documents
        const permissionDocs = [];

        for (const [menuId, permData] of Object.entries(permissions)) {
            permissionDocs.push({
                user_id,
                menu_id: menuId,
                permissions: {
                    read: !!permData.read,
                    write: !!permData.write,
                    delete: !!permData.delete
                },
                assigned_by: {
                    user_id: assigned_by._id,
                    name: assigned_by.name,
                    email: assigned_by.email
                }
            });
        }

        // Insert all new permissions at once
        if (permissionDocs.length > 0) {
            await UserPermission.insertMany(permissionDocs);
        }

        res.json({
            success: true,
            message: "User permissions saved successfully"
        });
    } catch (error) {
        logger.error("Error saving user permissions:", error);
        res.status(500).json({ success: false, message: "Error saving user permissions" });
    }
});

export default router;
