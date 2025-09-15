import mongoose from "mongoose";
import Designation from "../../models/Designation.js"
import Menu from "../../models/Menu.js";
import MenuAssignment from "../../models/menuAssignment.js";

import { buildMenuTree } from "../../utils/buildMenuTree.js";
// Render assign menu page
export const getAssignMenuPage = async (req, res) => {
    try {
        // 1️⃣ Fetch active designations
        const designations = await Designation.find({ status: "Active" })
            .select("name status")
            .sort({ name: 1 })
            .lean();

        // 2️⃣ Fetch all menus
        const menus = await Menu.find()
            .sort({ priority: 1, add_date: -1 })
            .populate("added_by updated_by", "name email")
            .lean();

        // 3️⃣ Build menu tree
        const masterMenus = buildMenuTree(menus);

        // 4️⃣ Render page
        res.render("pages/permissions/assign-menu", {
            masterMenus,
            designations
        });
    } catch (error) {
        console.error("Error in getAssignMenuPage:", error);
        res.status(500).render("pages/permissions/assign-menu", {
            masterMenus: [],
            designations: []
        });
    }
};


// Get assigned menus for a designation
export const getAssignedMenus = async (req, res) => {
    try {
        const { designation_id } = req.params;

        const assignedMenus = await MenuAssignment.find({ designation_id })
            .populate("menu_id", "name")
            .select("menu_id");

        const menuIds = assignedMenus.map(a => a.menu_id?._id?.toString());

        res.json({ success: true, data: menuIds });
    } catch (error) {
        console.error("Error fetching assigned menus:", error);
        res.status(500).json({ success: false, message: "Error fetching assigned menus" });
    }
};

// Assign menus to designation
export const assignMenusToDesignation = async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!designation_id || !Array.isArray(menu_ids) || menu_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Designation ID and menu IDs are required"
            });
        }

        // Get existing assignments
        const existing = await MenuAssignment.find({ designation_id }).select("menu_id");
        const existingIds = existing.map(e => e.menu_id.toString());

        // Find only new menu_ids that are not already assigned
        const newMenuIds = menu_ids.filter(id => !existingIds.includes(id));

        if (newMenuIds.length === 0) {
            return res.json({
                success: true,
                message: "No new menus to assign",
                data: []
            });
        }

        // Insert only new ones
        const assignments = newMenuIds.map(menu_id => ({ designation_id, menu_id }));
        const savedAssignments = await MenuAssignment.insertMany(assignments);

        // Update Designation audit info
        await Designation.findByIdAndUpdate(designation_id, {
            updated_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            },
            updated_date: Date.now()
        });

        res.json({
            success: true,
            message: "Menus assigned successfully",
            data: savedAssignments
        });
    } catch (error) {
        console.error("Error assigning menus:", error);
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

        return res.json({
            success: true,
            message: "Menus unassigned successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error in unAssignMenu:", error);
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
        let menus = [];

        if (profileType === "admin" || profileType === "superadmin") {
            // Admin: get all menus that are set to show
            menus = await Menu.find({ is_show: true }).sort({ priority: 1 });
        } else {
            // Regular user: get menus assigned to their designation
            const designationId = req.user?.userDetails?.designation_id;
            if (!designationId) {
                return res.status(400).json({
                    success: false,
                    message: "No designation assigned to user",
                });
            }

            const assignments = await MenuAssignment.find({
                designation_id: new mongoose.Types.ObjectId(designationId),
            }).populate("menu_id");

            menus = assignments
                .map(a => a.menu_id)
                .filter(m => m && m.is_show);
        }

        // Filter masters (top-level menus) and sort
        const masters = menus
            .filter(m => m.type === "Menu" && !m.master_id)
            .sort((a, b) => a.priority - b.priority);


        // Group children (submenus) under each master
        const grouped = masters.map(master => ({
            ...master.toObject(),
            children: menus
                .filter(m => m.master_id?.toString() === master._id.toString())
                .sort((a, b) => a.priority - b.priority),
        }));

        // Disable caching
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.set("Surrogate-Control", "no-store");

        res.json({
            success: true,
            data: grouped,
        });
    } catch (error) {
        console.error("Error in getSidebarForUser:", error);
        res.status(500).json({
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
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // avoid too large queries
        const skip = (page - 1) * limit;

        const [menus, total] = await Promise.all([
            Menu.find()
                .sort({ priority: 1, add_date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(), // lean for performance
            Menu.countDocuments()
        ]);

        const totalPages = Math.ceil(total / limit);
        res.render("pages/permissions/list", {
            menus,
            currentPage: page,
            totalPages,
            total,
            limit,
            layout: !req.xhr
        });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render add menu form
export const getAddMenu = async (req, res) => {
    try {
        // Only Masters can be parents
        const masters = await Menu.find({ type: "Menu", is_show: true }).sort({ name: 1 });


        // Render the unified form, menu is null for Add
        res.render("pages/permissions/add", { masters, menu: null });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render edit menu form
export const getEditMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (!menu) {
            return res.status(404).render("error", { message: "Menu not found" });
        }

        const masters = await Menu.find({ type: "Menu", is_show: true }).sort({ name: 1 });


        // Render the unified form, passing the existing menu
        res.render("pages/permissions/add", { masters, menu });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

