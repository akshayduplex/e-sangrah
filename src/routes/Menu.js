// import express from 'express';
// import Menu from '../models/Menu.js';
// import DesignationMenu from '../models/menuAssignment.js';
// import { getAddMenu, getEditMenu, getMenuList } from '../controllers/menuController.js';
// const router = express.Router();
// // Get all menus with pagination
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

// // Render menu list page
// router.get('/list', getMenuList);

// // Render add menu page
// router.get('/add', getAddMenu);

// // Render edit menu page
// router.get('/edit/:id', getEditMenu);

// export default router;
