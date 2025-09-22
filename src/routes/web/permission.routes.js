import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import checkUserPermission from "../../middlewares/checkPermission.js";
import {
    getAssignMenuPage,
    getAssignedMenus,
    assignMenusToDesignation,
    getAddMenu,
    getEditMenu,
    getMenuList,
} from "../../controllers/permissions/permisssions.js";
import {
    assignMenusValidator,
    getAssignedMenusValidator,
    getMenuListValidator,
    menuIdParamValidator,
} from "../../middlewares/validation/permissionValidator.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import Designation from "../../models/Designation.js";
import Menu from "../../models/Menu.js";
import UserPermission from "../../models/UserPermission.js";
import { profile_type } from "../../constant/constant.js";
import { buildMenuTree } from "../../utils/buildMenuTree.js";

const router = express.Router();

// Assign Permissions page
router.get("/assign", authenticate, async (req, res) => {
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
        console.error("Assign permissions error:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load permissions page" });
    }
});

// Assign menus to designation
router.get("/assign-menu", authenticate, checkUserPermission, getAssignMenuPage);
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusValidator, assignMenusToDesignation);

// User Permissions Page
router.get("/user/:id", authenticate, async (req, res) => {
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
        console.error("Error loading user permissions:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load user permissions" });
    }
});

// Get user permissions API
router.get("/user/:id/permissions", authenticate, async (req, res) => {
    try {
        const userPermissions = await UserPermission.find({ user_id: req.params.id })
            .populate("menu_id", "name type master_id")
            .lean();
        res.json({ success: true, data: userPermissions });
    } catch (err) {
        console.error("Error fetching user permissions:", err);
        res.status(500).json({ success: false, message: "Error fetching user permissions" });
    }
});

// Save user permissions
router.post("/user/save", authenticate, async (req, res) => {
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
        console.error("Error saving user permissions:", err);
        res.status(500).json({ success: false, message: "Error saving user permissions" });
    }
});

// Role Permissions Page
router.get("/roles", authenticate, (req, res) => {
    res.render("pages/permissions/roles-permissions", { user: req.user });
});

// Menu Management
router.get("/menu/list", authenticate, getMenuListValidator, getMenuList);
router.get("/menu/add", authenticate, getAddMenu);
router.get("/menu/add/:id", authenticate, menuIdParamValidator, getEditMenu);

export default router;
