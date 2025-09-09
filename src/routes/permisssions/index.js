// // routes/index.js
// const express = require('express');
// const router = express.Router();
// const permissionController = require("../../controllers/permissions/permisssions");
// const { default: Menu } = require('../../models/Menu');
// // Middleware to check authentication
// const requireAuth = (req, res, next) => {
//     if (req.session.user) {
//         next();
//     } else {
//         res.redirect('/login');
//     }
// };

// // Dashboard route
// router.get('/permissions', requireAuth, permissionController.permisssions);

// // User routes
// // router.get('/users', requireAuth, permissionController.listUsers);
// router.post('/users/add', requireAuth, permissionController.addUser);
// router.put('/users/update/:id', requireAuth, permissionController.updateUser);
// router.delete('/users/delete/:id', requireAuth, permissionController.deleteUser);

// // Menu routes
// // router.get('/menus', requireAuth, permissionController.listMenus);
// router.post('/menus/add', requireAuth, permissionController.addMenu);
// router.put('/menus/update/:id', requireAuth, permissionController.updateMenu);
// router.delete('/menus/delete/:id', requireAuth, permissionController.deleteMenu);

// // Designation routes
// // router.get('/designations', requireAuth, permissionController.listDesignations);
// router.post('/designations/add', requireAuth, permissionController.addDesignation);
// router.put('/designations/update/:id', requireAuth, permissionController.updateDesignation);
// router.delete('/designations/delete/:id', requireAuth, permissionController.deleteDesignation);
// // router.get('/designations/assign-menu/:id', requireAuth, permissionController.menuAssignmentPage);
// // router.post('/designations/assign-menu/:id', requireAuth, permissionController.assignMenus);
// router.patch('/designations/assign-menu/update/:id', requireAuth, permissionController.assignMenus);

// // Settings routes
// // router.get('/settings', requireAuth, permissionController.getSettings);
// router.post('/settings/update', requireAuth, permissionController.updateSettings);

// // router.get("/designation/:designation_id/menus", permissionController.getAssignedMenus);
// // router.post("/assign", permissionController.assignMenusToDesignation);


// //menu

// router.get('/', async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         const menus = await Menu.find()
//             .sort({ priority: 1, add_date: -1 })
//             .skip(skip)
//             .limit(limit)
//             .populate('master_id', 'name');

//         const total = await Menu.countDocuments();

//         res.json({
//             success: true,
//             data: menus,
//             pagination: {
//                 page,
//                 limit,
//                 total,
//                 pages: Math.ceil(total / limit)
//             }
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Create a new menu
// router.post('/', async (req, res) => {
//     try {
//         const {
//             type,
//             name,
//             icon,
//             url,
//             priority,
//             is_show,
//             master_id,
//             menu_id,
//             icon_code
//         } = req.body;

//         // Validate required fields
//         if (!type || !name || !priority) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Type, name, and priority are required'
//             });
//         }

//         const menu = new Menu({
//             type,
//             name,
//             icon,
//             url,
//             priority,
//             is_show: is_show !== undefined ? is_show : true,
//             master_id: master_id || null,
//             menu_id: menu_id || null,
//             icon_code
//         });

//         const savedMenu = await menu.save();

//         res.status(201).json({
//             success: true,
//             data: savedMenu
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Update a menu
// router.put('/:id', async (req, res) => {
//     try {
//         const menu = await Menu.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );

//         if (!menu) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Menu not found'
//             });
//         }

//         res.json({
//             success: true,
//             data: menu
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Delete a menu
// router.delete('/:id', async (req, res) => {
//     try {
//         const menu = await Menu.findByIdAndDelete(req.params.id);

//         if (!menu) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Menu not found'
//             });
//         }

//         // Also remove any designation assignments
//         await DesignationMenu.deleteMany({ menu_id: req.params.id });

//         res.json({
//             success: true,
//             message: 'Menu deleted successfully'
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Get menus by type
// router.get('/type/:type', async (req, res) => {
//     try {
//         const menus = await Menu.find({ type: req.params.type })
//             .sort({ priority: 1, name: 1 });

//         res.json({
//             success: true,
//             data: menus
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Assign menu to designation
// router.post('/assign', async (req, res) => {
//     try {
//         const { designation_id, menu_ids } = req.body;

//         if (!designation_id || !menu_ids || !Array.isArray(menu_ids)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Designation ID and menu IDs array are required'
//             });
//         }

//         // Remove existing assignments for this designation
//         await DesignationMenu.deleteMany({ designation_id });

//         // Create new assignments
//         const assignments = menu_ids.map(menu_id => ({
//             designation_id,
//             menu_id
//         }));

//         const savedAssignments = await DesignationMenu.insertMany(assignments);

//         res.status(201).json({
//             success: true,
//             data: savedAssignments
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });




// module.exports = router;

import express from "express";
import mongoose from "mongoose";
import Menu from "../../models/Menu.js";
import DesignationMenu from "../../models/menuAssignment.js";
import { assignMenusToDesignation, getAssignedMenus, getSidebarForUser, unAssignMenu } from "../../controllers/assignMenuController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --------------------
// Menu CRUD Endpoints
// --------------------

// Get paginated menus
router.get("/menu", async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const [menus, total] = await Promise.all([
            Menu.find()
                .sort({ priority: 1, add_date: -1 })
                .skip(skip)
                .limit(limit)
                .populate("master_id", "name")
                .lean(),
            Menu.countDocuments()
        ]);

        res.json({
            success: true,
            data: menus,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create menu
router.post("/menu", async (req, res) => {
    try {
        const { type, name, icon, url, priority, is_show, master_id, menu_id, icon_code } = req.body;

        if (!type || !name || priority === undefined) {
            return res.status(400).json({ success: false, message: "Type, name, and priority are required" });
        }

        const menu = new Menu({
            type,
            name,
            icon,
            url,
            priority,
            is_show: is_show !== undefined ? is_show : true,
            master_id: master_id || null,
            menu_id: menu_id || null,
            icon_code
        });

        const savedMenu = await menu.save();
        res.status(201).json({ success: true, data: savedMenu });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update menu
router.put("/menu/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid menu ID" });
        }

        const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });

        res.json({ success: true, data: menu });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete menu
router.delete("/menu/:id", async (req, res) => {
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
router.get("/menu/type/:type", async (req, res) => {
    try {
        const menus = await Menu.find({ type: req.params.type })
            .sort({ priority: 1, name: 1 })
            .lean();
        res.json({ success: true, data: menus });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ---------------------------
// Menu Assignment Endpoints
// ---------------------------

// Assign menus to a designation
router.post("/menu/assign", async (req, res) => {
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
router.delete("/assign-menu/unselect", unAssignMenu)
// For logged-in user’s sidebar
router.get("/sidebar", authenticate, getSidebarForUser);
// Get assigned menus for a designation
router.get("/assign-menu/designation/:designation_id/menus", getAssignedMenus);
router.post("/assign-menu/assign", assignMenusToDesignation);

export default router;
