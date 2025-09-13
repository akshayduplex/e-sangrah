// // controllers/userController.js
// import siteSetting from "../../models/siteSetting.js";
// import User from "../../models/User.js";
// import Designation from "../../models/Designation.js";
// import bcrypt from "bcryptjs";
// import Menu from "../../models/Menu.js";
// import MenuAssignment from "../../models/menuAssignment.js";
// import mongoose from "mongoose";

// // role permisssions page
// export const permisssions = async (req, res) => {
//     try {
//         if (!req.session.user) {
//             return res.redirect('/login');
//         }

//         // Get menus assigned to user's designation
//         const assignedMenus = await MenuAssignment.find({
//             designation_id: req.session.user.designation
//         }).populate('menu_id');

//         // Organize menus by type
//         const masters = [];
//         const menus = [];
//         const submenus = [];

//         assignedMenus.forEach(assignment => {
//             const menu = assignment.menu_id;
//             if (menu.type === 'Master') masters.push(menu);
//             else if (menu.type === 'Menu') menus.push(menu);
//             else if (menu.type === 'Submenu') submenus.push(menu);
//         });

//         res.render('/pages/permissions', {
//             title: 'Permissions',
//             user: req.session.user,
//             masters,
//             menus,
//             submenus
//         });
//     } catch (error) {
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load dashboard'
//         });
//     }
// };
// // List all users
// export const listUsers = async (req, res) => {
//     try {
//         const users = await User.find().populate('designation_id').sort({ add_date: -1 });
//         const designations = await Designation.find({ status: 'Active' });

//         res.render('/components/users/list', {
//             title: 'User Management',
//             users,
//             designations
//         });
//     } catch (error) {
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load users'
//         });
//     }
// };

// // Add new user
// export const addUser = async (req, res) => {
//     try {
//         const { user_name, user_email, raw_password, role_type, designation_id, whitelist_ip } = req.body;

//         // Check if user already exists
//         const existingUser = await User.findOne({ user_email });
//         if (existingUser) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User with this email already exists'
//             });
//         }

//         // Hash password
//         const saltRounds = 10;
//         const hashedPassword = await bcrypt.hash(raw_password, saltRounds);

//         // Create new user
//         const user = new User({
//             user_name,
//             user_email,
//             raw_password,
//             enc_password: hashedPassword,
//             role_type,
//             designation_id,
//             whitelist_ip: whitelist_ip || null,
//             status: 'Active'
//         });

//         await user.save();
//         res.json({ success: true, message: 'User created successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create user'
//         });
//     }
// };

// // Update user
// export const updateUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { user_name, user_email, role_type, designation_id, status, whitelist_ip } = req.body;

//         await User.findByIdAndUpdate(id, {
//             user_name,
//             user_email,
//             role_type,
//             designation_id,
//             status,
//             whitelist_ip: whitelist_ip || null,
//             update_date: Date.now()
//         });

//         res.json({ success: true, message: 'User updated successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update user'
//         });
//     }
// };

// // Delete user
// export const deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         await User.findByIdAndDelete(id);
//         res.json({ success: true, message: 'User deleted successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete user'
//         });
//     }
// };


// // Get settings page
// export const getSettings = async (req, res) => {
//     try {
//         let settings = await siteSetting.findOne();

//         if (!settings) {
//             // Create default settings if none exist
//             settings = new siteSetting({
//                 site_title: 'Hindustan Latex Family Planning Promotion Trust',
//                 meta_title: 'Hindustan Latex Family Planning Promotion Trust',
//                 meta_description: 'Hindustan Latex Family Planning Promotion Trust'
//             });
//             await settings.save();
//         }

//         res.render('components/settings/index', {
//             title: 'Site Settings',
//             settings
//         });
//     } catch (error) {
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load settings'
//         });
//     }
// };

// // Update settings
// export const updateSettings = async (req, res) => {
//     try {
//         const {
//             site_title, meta_title, meta_description, currency,
//             office_address, office_city, office_latitude, office_longitude,
//             time_zone, smtp_enable_status, sms_enable_status,
//             smtp_email_content_type, smtp_encryption_type, smtp_from_mail,
//             smtp_host, smtp_password, smtp_port, smtp_reply_mail,
//             smtp_username, job_portal_link, website_link,
//             organization_email_id, organization_mobile_no,
//             organization_name, organization_whatsapp_no
//         } = req.body;

//         // Handle file uploads (logo and favicon)
//         let logo_image = req.body.existing_logo;
//         let fav_icon_image = req.body.existing_favicon;

//         if (req.files) {
//             if (req.files.logo_image) {
//                 logo_image = req.files.logo_image[0].filename;
//             }
//             if (req.files.fav_icon_image) {
//                 fav_icon_image = req.files.fav_icon_image[0].filename;
//             }
//         }

//         await siteSetting.findOneAndUpdate({}, {
//             site_title,
//             meta_title,
//             meta_description,
//             logo_image,
//             fav_icon_image,
//             currency,
//             office_address,
//             office_city,
//             office_latitude,
//             office_longitude,
//             time_zone,
//             smtp_enable_status,
//             sms_enable_status,
//             smtp_email_content_type,
//             smtp_encryption_type,
//             smtp_from_mail,
//             smtp_host,
//             smtp_password,
//             smtp_port,
//             smtp_reply_mail,
//             smtp_username,
//             job_portal_link,
//             website_link,
//             organization_email_id,
//             organization_mobile_no,
//             organization_name,
//             organization_whatsapp_no,
//             updated_on: Date.now()
//         }, { upsert: true });

//         res.json({ success: true, message: 'Settings updated successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update settings'
//         });
//     }
// };

// // List all menus
// export const listMenus = async (req, res) => {
//     try {
//         const menus = await Menu.find().sort({ priority: 1 });
//         const masters = await Menu.find({ type: 'Master' }).sort({ priority: 1 });

//         res.render('components/menus/list', {
//             title: 'Menu Management',
//             menus,
//             masters
//         });
//     } catch (error) {
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load menus'
//         });
//     }
// };

// // Add new menu
// export const addMenu = async (req, res) => {
//     try {
//         const { type, master_id, name, icon, url, priority, is_show } = req.body;
//         console.log("all menus data", type, master_id, name, icon, url, priority, is_show)

//         if (!name || !type || !priority) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Name, type, and priority are required'
//             });
//         }

//         const menu = new Menu({
//             type,
//             master_id: type !== 'Master' ? master_id : null,
//             name,
//             icon: icon || null,
//             url: url || null,
//             priority: Number.isInteger(parseInt(priority)) ? parseInt(priority) : 0,
//             is_show: String(is_show).toLowerCase() === 'yes' || String(is_show).toLowerCase() === 'true'
//         });

//         await menu.save();
//         res.json({ success: true, message: 'Menu created successfully' });

//     } catch (error) {
//         console.error('Error creating menu:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create menu'
//         });
//     }
// };


// // Update menu
// export const updateMenu = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { type, master_id, name, icon, url, priority, is_show } = req.body;

//         await Menu.findByIdAndUpdate(id, {
//             type,
//             master_id: type !== 'Master' ? master_id : null,
//             name,
//             icon: icon || null,
//             url: url || null,
//             priority: parseInt(priority),
//             is_show: is_show === 'Yes',
//             update_date: Date.now()
//         });

//         res.json({ success: true, message: 'Menu updated successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update menu'
//         });
//     }
// };

// // Delete menu
// export const deleteMenu = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Check if menu has submenus
//         const hasSubmenus = await Menu.exists({ master_id: id });
//         if (hasSubmenus) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cannot delete menu with submenus'
//             });
//         }

//         // Remove menu assignments
//         await MenuAssignment.deleteMany({ menu_id: id });

//         // Delete menu
//         await Menu.findByIdAndDelete(id);

//         res.json({ success: true, message: 'Menu deleted successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete menu'
//         });
//     }
// };

// export const listDesignations = async (req, res) => {
//     try {
//         const designations = await Designation.find().sort({ add_date: -1 });
//         res.render('components/designations/list', {
//             title: 'Designation Management',
//             designations
//         });
//     } catch (error) {
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load designations'
//         });
//     }
// };

// // Add new designation
// export const addDesignation = async (req, res) => {
//     try {
//         const { name, description } = req.body;

//         const designation = new Designation({
//             name,
//             description: description || '',
//             status: 'Active'
//         });

//         await designation.save();
//         res.json({ success: true, message: 'Designation created successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to create designation'
//         });
//     }
// };

// // Update designation
// export const updateDesignation = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, description, status } = req.body;

//         await Designation.findByIdAndUpdate(id, {
//             name,
//             description: description || '',
//             status,
//             update_date: Date.now()
//         });

//         res.json({ success: true, message: 'Designation updated successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update designation'
//         });
//     }
// };

// // Delete designation
// export const deleteDesignation = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const hasUsers = await User.exists({ designation_id: id });
//         if (hasUsers) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cannot delete designation with assigned users'
//             });
//         }

//         // Remove menu assignments
//         await MenuAssignment.deleteMany({ designation_id: id });

//         // Delete designation
//         await Designation.findByIdAndDelete(id);

//         res.json({ success: true, message: 'Designation deleted successfully' });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to delete designation'
//         });
//     }
// };

// // GET: Menu Assignment Page

// export const menuAssignmentPage = async (req, res) => {
//     try {
//         const { id } = req.params;

//         // 1️⃣ Fetch designation
//         const designation = await Designation.findById(id).lean();
//         if (!designation) {
//             return res.status(404).render('error', {
//                 title: 'Not Found',
//                 error: 'Designation not found'
//             });
//         }

//         // 2️⃣ Fetch all menus
//         const menus = await Menu.find().sort({ priority: 1 }).lean();

//         // 3️⃣ Fetch assigned menus for this designation
//         const assignment = await MenuAssignment.findOne({ designation_id: id }).lean();
//         const assignedMenuIds = assignment ? assignment.menu_id.map(m => m.toString()) : [];

//         // 4️⃣ Render page with all data
//         res.render('components/designations/assign-menu', {
//             title: 'Assign Menu to Designation',
//             designation,
//             menus,
//             assignedMenuIds
//         });

//     } catch (error) {
//         console.error("Error loading menu assignment page:", error);
//         res.status(500).render('error', {
//             title: 'Error',
//             error: 'Failed to load menu assignment page'
//         });
//     }
// };


// // PATCH Assign menus to a designation
// export const assignMenus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         let { menu_ids } = req.body;

//         // Validate input
//         if (!menu_ids) menu_ids = [];
//         else if (!Array.isArray(menu_ids)) menu_ids = [menu_ids];

//         // Convert to ObjectId
//         const menuObjectIds = menu_ids.map(m => new mongoose.Types.ObjectId(m));

//         // Update or create assignment
//         const updated = await MenuAssignment.findOneAndUpdate(
//             { designation_id: id },
//             { $set: { menu_id: menuObjectIds, assigned_date: new Date() } },
//             { upsert: true, new: true }
//         );

//         res.status(200).json({ success: true, assignment: updated });
//     } catch (error) {
//         console.error("Error updating menu assignment:", error);
//         res.status(500).json({ success: false, message: "Failed to update menu assignment" });
//     }
// };



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
    // try {
    //     const designationId = req.user.designation_id;

    //     const assignments = await MenuAssignment.find({
    //         designation_id: new mongoose.Types.ObjectId(designationId) // string is okay
    //     }).populate("menu_id");


    //     const menus = assignments
    //         .map(a => a.menu_id)
    //         .filter(m => m && m.is_show);

    //     const masters = menus
    //         .filter(m => m.type === "Master" || m.type === "Dashboard")
    //         .sort((a, b) => a.priority - b.priority);

    //     const grouped = masters.map(master => ({
    //         ...master.toObject(),
    //         children: menus
    //             .filter(m => m.master_id?.toString() === master._id.toString())
    //             .sort((a, b) => a.priority - b.priority)
    //     }));

    //     // **Important: disable caching**
    //     res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    //     res.set("Pragma", "no-cache");
    //     res.set("Expires", "0");
    //     res.set("Surrogate-Control", "no-store");

    //     res.json({
    //         success: true,
    //         data: grouped
    //     });
    // } catch (error) {
    //     console.error("Error in getSidebarForUser:", error);
    //     res.status(500).json({
    //         success: false,
    //         message: "Error fetching sidebar",
    //         error: process.env.NODE_ENV === "development" ? error.message : {}
    //     });
    // }
    try {
        const profileType = req.user?.profile_type;

        let menus = [];

        if (profileType === "admin") {
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
            .filter(m => m.type === "Master" || m.type === "Dashboard")
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
        const masters = await Menu.find({ type: "Master", is_show: true }).sort({ name: 1 });

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

        const masters = await Menu.find({ type: "Master", is_show: true }).sort({ name: 1 });

        // Render the unified form, passing the existing menu
        res.render("pages/permissions/add", { masters, menu });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

