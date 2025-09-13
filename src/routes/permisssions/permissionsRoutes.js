import express from "express";
import mongoose from "mongoose";
import Menu from "../../models/Menu.js";
import DesignationMenu from "../../models/menuAssignment.js";
import { assignMenusToDesignation, getAssignedMenus, getSidebarForUser, unAssignMenu } from "../../controllers/permissions/permisssions.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { assignMenusValidator, getAssignedMenusValidator, unAssignMenusValidator } from "../../validators/permissionsValidator.js";

const router = express.Router();

// --------------------
// Menu CRUD Endpoints
// --------------------

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

        const menu = new Menu({
            type,
            master_id: master_id || null,
            name,
            icon_code: icon_code || '',
            url: url || '#',
            priority: parseInt(priority) || 1,
            is_show: is_show === 'true' || is_show === true,
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
        console.error("Error creating menu:", error);
        res.status(500).json({ success: false, message: "Error creating menu" });
    }
});

// Update menu
router.put("/menu/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, master_id, name, icon_code, url, priority, is_show } = req.body;

        const menu = await Menu.findByIdAndUpdate(
            id,
            {
                type,
                master_id: master_id || null,
                name,
                icon_code,
                url,
                priority,
                is_show: is_show === "true",
                updated_by: {
                    user_id: req.session.user_id,
                    name: req.user.name,
                    email: req.user.email
                },
                updated_date: Date.now()
            },
            { new: true }
        );

        if (!menu) {
            return res.status(404).json({ success: false, message: "Menu not found" });
        }

        res.json({ success: true, data: menu });
    } catch (error) {
        console.error("Error updating menu:", error);
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
        console.error("Toggle menu status error:", error);
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
router.delete("/assign-menu/unselect", authenticate, unAssignMenusValidator, unAssignMenu)
// For logged-in user’s sidebar
router.get("/sidebar", authenticate, getSidebarForUser);
// Get assigned menus for a designation
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusValidator, assignMenusToDesignation);

export default router;
