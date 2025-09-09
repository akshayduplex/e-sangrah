import Designation from "../models/Designation.js";
import Menu from "../models/Menu.js";
import MenuAssignment from "../models/menuAssignment.js";
import DesignationMenu from "../models/menuAssignment.js";

// Render assign menu page
export const getAssignMenuPage = async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 });
        const menus = await Menu.find({ is_show: true })
            .populate("master_id", "name")
            .sort({ type: 1, priority: 1 });

        // Group menus by type
        const masterMenus = menus.filter(menu => menu.type === "Master");
        const regularMenus = menus.filter(menu => menu.type === "Menu");
        const submenus = menus.filter(menu => menu.type === "Submenu");

        // Organize submenus under their parent menus
        const menuStructure = regularMenus.map(menu => {
            const children = submenus.filter(
                submenu => submenu.menu_id && submenu.menu_id.toString() === menu._id.toString()
            );
            return {
                ...menu.toObject(),
                children
            };
        });

        res.render("menu/assign-menu", {
            designations,
            masterMenus,
            menuStructure
        });
    } catch (error) {
        console.error("Error loading assign menu page:", error);
        res.status(500).render("error", {
            message: "Error loading assign menu page",
            error: process.env.NODE_ENV === "development" ? error : {}
        });
    }
};

// Get assigned menus for a designation
export const getAssignedMenus = async (req, res) => {
    try {
        const { designation_id } = req.params;

        const assignedMenus = await DesignationMenu.find({ designation_id })
            .populate("menu_id")
            .select("menu_id");

        const menuIds = assignedMenus.map(
            assignment => assignment.menu_id._id.toString()
        );

        res.json({
            success: true,
            data: menuIds
        });
    } catch (error) {
        console.error("Error fetching assigned menus:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching assigned menus"
        });
    }
};

// Assign menus to designation
export const assignMenusToDesignation = async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!designation_id || !menu_ids) {
            return res.status(400).json({
                success: false,
                message: "Designation ID and menu IDs are required"
            });
        }

        // Remove existing assignments for this designation
        // await DesignationMenu.deleteMany({ designation_id });

        // Create new assignments
        const uniqueMenuIds = [...new Set(menu_ids.map(id => id.toString()))];
        const assignments = uniqueMenuIds.map(menu_id => ({
            designation_id,
            menu_id
        }));


        const savedAssignments = await DesignationMenu.insertMany(assignments);

        res.json({
            success: true,
            message: "Menus assigned successfully",
            data: savedAssignments
        });
    } catch (error) {
        console.error("Error assigning menus:", error);
        res.status(500).json({
            success: false,
            message: "Error assigning menus"
        });
    }
};

export const unAssignMenu = async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!Array.isArray(menu_ids) || menu_ids.length === 0) {
            return res.status(400).json({ message: "menu_ids must be a non-empty array" });
        }

        const result = await MenuAssignment.deleteMany({
            designation_id,
            menu_id: { $in: menu_ids }
        });

        res.json({
            message: "Menus unselected successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Get sidebar menus for logged-in user
export const getSidebarForUser = async (req, res) => {
    try {
        const designationId = req.user.designation_id;
        console.log("User designation ID:", designationId);
        const assignments = await MenuAssignment.find({ designation_id: designationId })
            .populate("menu_id");
        console.log("Menu assignments:", assignments);
        // Filter only visible menus
        const menus = assignments
            .map(a => a.menu_id)
            .filter(menu => menu && menu.is_show);

        // Build hierarchy
        const masters = menus.filter(m => m.type === "Master");
        const grouped = masters.map(master => ({
            ...master.toObject(),
            menus: menus.filter(m => m.master_id?.toString() === master._id.toString())
        }));

        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};