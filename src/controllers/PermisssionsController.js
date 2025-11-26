import mongoose from "mongoose";
import Designation from "../models/Designation.js"
import Menu from "../models/Menu.js";
import MenuAssignment from "../models/MenuAssignment.js";
import { buildMenuTree } from "../utils/buildMenuTree.js";
import logger from "../utils/logger.js";
import { profile_type } from "../constant/Constant.js";
import Department from "../models/Departments.js";
import User from "../models/User.js";
import UserPermission from "../models/UserPermission.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";
import { activityLogger } from "../helper/activityLogger.js";
//Page Controllers

// Assign Permissions page
export const showAssignPermissionsPage = async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/permissions/assign-permissions", {
            pageTitle: "Assign Permissions",
            pageDescription: "Assign permissions to users based on their roles, departments, and designations.",
            metaKeywords: "assign permissions, user roles, department access, designation permissions",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            user: req.user,
            Roles: profile_type,
            designations,
            departments,
            profile_type
        });
    } catch (err) {
        logger.error("Error rendering assign permissions page:", err);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load assign permissions page.",
            metaKeywords: "assign permissions error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            user: req.user,
            message: "Something went wrong while loading assign permissions page"
        });
    }
};


// Get user permissions page
export const showUserPermissionsPage = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) {
            return res.status(404).render("pages/error", {
                pageTitle: "User Not Found",
                pageDescription: "The requested user does not exist.",
                metaKeywords: "user not found, permissions error",
                canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

                user: req.user,
                message: "User not found"
            });
        }

        const menus = await Menu.find({ isActive: true })
            .sort({ priority: 1, add_date: -1 })
            .lean();

        const masterMenus = buildMenuTree(menus);

        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id")
            .lean();

        const permissionMap = {};
        userPermissions.forEach(perm => {
            if (perm.menu_id) {
                permissionMap[perm.menu_id._id.toString()] = perm.permissions;
            } else {
                logger.warn(`Missing menu for permission ID: ${perm._id}`);
            }
        });

        res.render("pages/permissions/assign-user-permissions", {
            pageTitle: "User Permissions",
            pageDescription: `View and manage permissions for ${user.name || "the user"}.`,
            metaKeywords: "user permissions, assign permissions, access management",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            user: req.user,
            targetUser: user,
            masterMenus,
            permissionMap
        });
    } catch (err) {
        logger.error("Error loading user permissions page:", err);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load user permissions page.",
            metaKeywords: "user permissions error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            user: req.user,
            message: "Something went wrong while loading user permissions"
        });
    }
};


// Get user permissions API
export const getUserPermissions = async (req, res) => {
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
};

// Save user permissions
export const saveUserPermissions = async (req, res) => {
    try {
        const { user_id, permissions } = req.body;
        const assigned_by = req.user;

        if (!user_id || !permissions || Object.keys(permissions).length === 0) {
            return res.status(400).json({
                success: false,
                message: "User ID and permissions are required"
            });
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
                    delete: !!permData.delete
                },
                assigned_by: {
                    user_id: assigned_by._id,
                    name: assigned_by.name,
                    email: assigned_by.email
                }
            });
        }

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
};



//API Controllers

// Render assign menu page
export const getAssignMenuPage = async (req, res) => {
    try {
        // Fetch active designations
        const designations = await Designation.find({ status: "Active" })
            .select("name status")
            .sort({ name: 1 })
            .lean();

        // Fetch all menus
        const menus = await Menu.find()
            .sort({ priority: 1, add_date: -1 })
            .populate("added_by updated_by", "name email")
            .lean();

        // Build menu tree
        const masterMenus = buildMenuTree(menus);

        // Render page
        res.render("pages/permissions/assign-menu", {
            pageTitle: "Assign Menu",
            pageDescription: "Assign menus and submenus to designations and manage access control.",
            metaKeywords: "assign menu, menu permissions, designation access, manage menus",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            masterMenus,
            designations,
            user: req.user
        });
    } catch (error) {
        logger.error("Error in getAssignMenuPage:", error);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load assign menu page.",
            metaKeywords: "assign menu error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            user: req.user,
            message: "Failed to load assign menu page"
        });
    }
};



// Get assigned menus for a designation
export const getAssignedMenus = async (req, res) => {
    try {
        const { designation_id } = req.params;

        const assignedMenus = await MenuAssignment.find({ designation_id })
            .populate("menu_id", "name")
            .select("menu_id permissions");
        const menuData = assignedMenus.map(a => ({
            menu_id: a.menu_id?._id?.toString(),
            permissions: a.permissions || { read: false, write: false, create: false, delete: false }
        }));

        res.json({ success: true, data: menuData });
    } catch (error) {
        logger.error("Error fetching assigned menus:", error);
        res.status(500).json({ success: false, message: "Error fetching assigned menus" });
    }
};

// Assign menus to designation
export const assignMenusToDesignation = async (req, res) => {
    try {
        const { designation_id, menus } = req.body;

        if (!designation_id || !Array.isArray(menus)) {
            return res.status(400).json({
                success: false,
                message: "Designation ID and menus array are required"
            });
        }

        // Remove existing assignments
        await MenuAssignment.deleteMany({ designation_id });

        if (menus.length > 0) {
            const assignments = menus.map(m => ({
                designation_id,
                menu_id: m.menu_id,
                permissions: m.permissions || { read: false, write: false, delete: false }
            }));

            await MenuAssignment.insertMany(assignments);
        }
        await activityLogger({
            actorId: req.user._id,
            entityId: designation_id,
            entityType: "Designation",
            action: "ASSIGN_MENUS",
            details: ` ${req.user?.name} assigned menus to designation`,
            meta: { menus }
        });
        // incrementGlobalPermissionsVersion(designation_id);
        res.json({
            success: true,
            message: "Menus assigned successfully",
            data: menus
        });
    } catch (error) {
        logger.error("Error assigning menus:", error);
        res.status(500).json({ success: false, message: "Error assigning menus" });
    }
};

// Unassign menus from designation
export const unAssignMenu = async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!designation_id || !Array.isArray(menu_ids) || menu_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Designation ID and menu_ids are required"
            });
        }

        const result = await MenuAssignment.deleteMany({
            designation_id,
            menu_id: { $in: menu_ids }
        });

        // Update Designation audit info
        await Designation.findByIdAndUpdate(designation_id, {
            updated_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            },
            updated_date: Date.now()
        });
        await activityLogger({
            actorId: req.user._id,
            entityId: designation_id,
            entityType: "Designation",
            action: "UNASSIGN_MENUS",
            details: `${req.user?.name} unassigned menus`,
            meta: { menu_ids, deletedCount: result.deletedCount }
        });
        return res.json({
            success: true,
            message: "Menus unassigned successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error("Error in unAssignMenu:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Get sidebar menus for logged-in user

export const getSidebarForUser = async (req, res) => {
    try {
        const profileType = req.user?.profile_type;
        let designationId = null;

        // ================================
        // FIX: GET DESIGNATION FOR ALL USER TYPES
        // ================================
        if (!["superadmin", "admin"].includes(profileType)) {
            switch (profileType) {
                case "user":
                    designationId = req.user?.userDetails?.designation;
                    break;

                case "vendor":
                    designationId = req.user?.vendorDetails?.designation;
                    break;

                case "donor":
                    designationId = req.user?.donorDetails?.designation;
                    break;
            }
        }
        // ================================

        let assignedMenus = [];

        // 1. Superadmin: all menus, no filter
        if (profileType === "superadmin") {
            assignedMenus = await Menu.find(
                {},
                { name: 1, url: 1, icon_code: 1, type: 1, master_id: 1, priority: 1 }
            )
                .sort({ priority: 1 })
                .lean();

            // 2. Admin: only active + is_show
        } else if (profileType === "admin") {
            assignedMenus = await Menu.find(
                { is_show: true, isActive: true },
                { name: 1, url: 1, icon_code: 1, type: 1, master_id: 1, priority: 1 }
            )
                .sort({ priority: 1 })
                .lean();

            // 3. Normal users (including donors/vendors)
        } else {

            if (!designationId) {
                return res.status(400).json({
                    success: false,
                    message: "No designation assigned to user",
                });
            }

            const assignments = await MenuAssignment.aggregate([
                {
                    $match: {
                        designation_id: new mongoose.Types.ObjectId(designationId)
                    }
                },
                {
                    $lookup: {
                        from: "menus",
                        localField: "menu_id",
                        foreignField: "_id",
                        as: "menu",
                    },
                },
                { $unwind: "$menu" },

                // filter menus
                { $match: { "menu.isActive": true, "menu.is_show": true } },

                {
                    $project: {
                        _id: "$menu._id",
                        name: "$menu.name",
                        url: "$menu.url",
                        icon_code: "$menu.icon_code",
                        type: "$menu.type",
                        master_id: "$menu.master_id",
                        priority: "$menu.priority",
                        permissions: "$permissions.read",
                    },
                },

                // Fetch parents for full chain
                {
                    $graphLookup: {
                        from: "menus",
                        startWith: "$master_id",
                        connectFromField: "master_id",
                        connectToField: "_id",
                        as: "parents",
                        restrictSearchWithMatch: {
                            isActive: true,
                            is_show: true,
                        },
                    },
                },
            ]);

            // Merge assigned + parents
            const allMenus = [];
            for (const a of assignments) {
                allMenus.push({
                    _id: a._id,
                    name: a.name,
                    url: a.url,
                    icon_code: a.icon_code,
                    type: a.type,
                    master_id: a.master_id,
                    priority: a.priority,
                    permissions: a.permissions || {},
                });

                if (Array.isArray(a.parents)) {
                    for (const p of a.parents) {
                        allMenus.push({
                            _id: p._id,
                            name: p.name,
                            url: p.url,
                            icon_code: p.icon_code,
                            type: p.type,
                            master_id: p.master_id,
                            priority: p.priority,
                            permissions: {},
                        });
                    }
                }
            }

            // Deduplicate menus
            const menuMap = new Map();
            for (const m of allMenus) {
                menuMap.set(m._id.toString(), m);
            }
            assignedMenus = Array.from(menuMap.values());
        }

        // Build hierarchy
        const buildHierarchy = (menus, parentId = null) => {
            return menus
                .filter(m => {
                    const mid = m.master_id ? m.master_id.toString() : null;
                    return mid === (parentId ? parentId.toString() : null);
                })
                .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                .map(m => ({
                    _id: m._id,
                    name: m.name,
                    url: m.url,
                    icon_code: m.icon_code,
                    type: m.type,
                    permissions: m.permissions || {},
                    children: buildHierarchy(menus, m._id),
                }));
        };

        const sidebar = buildHierarchy(assignedMenus);

        return res.json({ success: true, data: sidebar });

    } catch (error) {
        logger.error("Error in getSidebarForUser:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching sidebar",
            error: process.env.NODE_ENV === "development" ? error.message : {},
        });
    }
};

// Render menu list with pagination
export const getMenuList = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const [menus, total] = await Promise.all([
            Menu.find()
                .sort({ priority: 1, add_date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Menu.countDocuments()
        ]);

        const totalPages = Math.ceil(total / limit);

        res.render("pages/permissions/list", {
            pageTitle: "Menu List",
            pageDescription: "View and manage all menus and submenus for your system.",
            metaKeywords: "menu list, system menus, permissions, menu management",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            menus,
            currentPage: page,
            totalPages,
            user: req.user,
            total,
            limit,
            layout: !req.xhr
        });
    } catch (error) {
        console.error("Error loading menu list:", error);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load menu list.",
            metaKeywords: "menu error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            message: error.message,
            user: req.user
        });
    }
};

// Render add menu form
export const getAddMenu = async (req, res) => {
    try {
        const masters = await Menu.find({ type: "Menu", isActive: true }).sort({ name: 1 });

        res.render("pages/permissions/add", {
            pageTitle: "Add Menu",
            pageDescription: "Create a new menu or submenu for the system.",
            metaKeywords: "add menu, create menu, menu management",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            masters,
            menu: null,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading add menu form:", error);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load add menu page.",
            metaKeywords: "add menu error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            message: error.message,
            user: req.user
        });
    }
};

// Render edit menu form
export const getEditMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu) {
            return res.status(404).render("pages/error", {
                pageTitle: "Menu Not Found",
                pageDescription: "The requested menu does not exist.",
                metaKeywords: "menu not found, edit menu error",
                canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

                message: "Menu not found",
                user: req.user
            });
        }

        const masters = await Menu.find({ type: "Menu", is_show: true }).sort({ name: 1 });
        res.render("pages/permissions/add", {
            pageTitle: "Edit Menu",
            pageDescription: "Edit the details of an existing menu or submenu.",
            metaKeywords: "edit menu, menu management, update menu",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            masters,
            menu,
            user: req.user
        });
    } catch (error) {
        console.error("Error loading edit menu form:", error);
        res.status(500).render("pages/error", {
            pageTitle: "Error",
            pageDescription: "Unable to load edit menu page.",
            metaKeywords: "edit menu error, page load error",
            canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,

            message: error.message,
            user: req.user
        });
    }
};