import mongoose from "mongoose";
import Designation from "../models/Designation.js";
import Menu from "../models/Menu.js";
import MenuAssignment from "../models/menuAssignment.js";

// Render assign menu page
export const getAssignMenuPage = async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 });
        const response = await fetch('http://localhost:5000/api/menu');
        const result = await response.json();

        if (!result.success) {
            return res.render('assignMenu', { masterMenus: [], designations: [] });
        }

        const allMenus = result.data;

        // Filter only Master
        const masters = allMenus.filter(m => m.type === 'Master');

        // Attach Menu children under their Master
        const masterMenus = masters.map(master => {
            return {
                ...master,
                menus: allMenus.filter(menu =>
                    menu.type === 'Menu' && menu.master_id && menu.master_id._id === master._id
                )
            };
        });

        res.render('menu/assign-menu', {
            masterMenus,
            designations: designations
        });

    } catch (err) {
        console.error('Error:', err);
        res.render('assignMenu', { masterMenus: [], designations: [] });
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
        const designationId = req.user.designation_id;
        console.log("Designation ID:", designationId);

        // Ensure designationId is an ObjectId
        const assignments = await MenuAssignment.find({
            designation_id: new mongoose.Types.ObjectId(designationId)
        }).populate("menu_id");

        // Filter only visible menus
        const menus = assignments
            .map(a => a.menu_id)
            .filter(m => m && m.is_show);

        // Build hierarchy: Masters → Menus/Submenus
        const masters = menus
            .filter(m => m.type === "Master")
            .sort((a, b) => a.priority - b.priority);

        const grouped = masters.map(master => ({
            ...master.toObject(),
            children: menus
                .filter(m => m.master_id?.toString() === master._id.toString())
                .sort((a, b) => a.priority - b.priority)
        }));

        // Prevent cached 304 responses
        // res.set("Cache-Control", "no-store");

        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        console.error("Error in getSidebarForUser:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching sidebar",
            error: process.env.NODE_ENV === "development" ? error.message : {}
        });
    }
};
