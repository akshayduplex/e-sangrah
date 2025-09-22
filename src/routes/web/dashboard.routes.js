import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import Designation from "../../models/Designation.js";
import Menu from "../../models/Menu.js";
import UserPermission from "../../models/UserPermission.js";
import { profile_type } from "../../constant/constant.js";
import { buildMenuTree } from "../../utils/buildMenuTree.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", authenticate, (req, res) => {
    try {
        res.render("pages/dashboard", { user: req.user });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", { user: req.user, message: "Unable to load dashboard" });
    }
});

// Upload folder
router.get("/upload-folder", authenticate, (req, res) => {
    res.render("pages/upload-folder", { title: "E-Sangrah - Upload-Folder" });
});

// Notifications
router.get("/notifications", authenticate, (req, res) => {
    res.render("pages/notifications", { title: "E-Sangrah - Notifications" });
});

// My Profile
router.get("/my-profile", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) return res.status(404).send("User not found");
        res.render("pages/myprofile", { user });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Server Error");
    }
});

/* ===========================
   Role and Permmissions Assignment
=========================== */
// Render assign-permissions page
router.get("/assign-permissions", authenticate, async (req, res) => {
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
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});

// Get user permissions page
router.get("/user-permissions/:id", authenticate, async (req, res) => {
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
                console.warn(`Missing menu for permission ID: ${perm._id}`);
            }
        });

        res.render("pages/permissions/assign-user-permissions", {
            user: req.user,
            targetUser: user,
            masterMenus,
            permissionMap
        });
    } catch (err) {
        console.error("Error loading user permissions page:", err);
        res.status(500).render("error", {
            user: req.user,
            message: "Something went wrong while loading user permissions",
        });
    }
});

// Get user permissions API
router.get("/user/:id/permissions", authenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id", "name type master_id")
            .lean();

        res.json({ success: true, data: userPermissions });
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ success: false, message: "Error fetching user permissions" });
    }
});

// Save user permissions
router.post("/user/permissions", authenticate, async (req, res) => {
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
        console.error("Error saving user permissions:", error);
        res.status(500).json({ success: false, message: "Error saving user permissions" });
    }
});


router.get("/role-permissions", authenticate, (req, res) => {
    try {
        res.render("pages/permissions/roles-permissions", { user: req.user });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});

export default router;
