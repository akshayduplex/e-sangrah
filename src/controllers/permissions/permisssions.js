// controllers/userController.js
const siteSetting = require("../../models/siteSetting");
const User = require("../../models/User");
const Designation = require("../../models/Designation");
const bcrypt = require("bcryptjs");
const Menu = require("../../models/Menu");
const MenuAssignment = require("../../models/menuAssignment");
const mongoose = require("mongoose");

// role permisssions page
exports.permisssions = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        // Get menus assigned to user's designation
        const assignedMenus = await MenuAssignment.find({
            designation_id: req.session.user.designation
        }).populate('menu_id');

        // Organize menus by type
        const masters = [];
        const menus = [];
        const submenus = [];

        assignedMenus.forEach(assignment => {
            const menu = assignment.menu_id;
            if (menu.type === 'Master') masters.push(menu);
            else if (menu.type === 'Menu') menus.push(menu);
            else if (menu.type === 'Submenu') submenus.push(menu);
        });

        res.render('/pages/permissions', {
            title: 'Permissions',
            user: req.session.user,
            masters,
            menus,
            submenus
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load dashboard'
        });
    }
};
// List all users
exports.listUsers = async (req, res) => {
    try {
        const users = await User.find().populate('designation_id').sort({ add_date: -1 });
        const designations = await Designation.find({ status: 'Active' });

        res.render('/components/users/list', {
            title: 'User Management',
            users,
            designations
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load users'
        });
    }
};

// Add new user
exports.addUser = async (req, res) => {
    try {
        const { user_name, user_email, raw_password, role_type, designation_id, whitelist_ip } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ user_email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(raw_password, saltRounds);

        // Create new user
        const user = new User({
            user_name,
            user_email,
            raw_password,
            enc_password: hashedPassword,
            role_type,
            designation_id,
            whitelist_ip: whitelist_ip || null,
            status: 'Active'
        });

        await user.save();
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_email, role_type, designation_id, status, whitelist_ip } = req.body;

        await User.findByIdAndUpdate(id, {
            user_name,
            user_email,
            role_type,
            designation_id,
            status,
            whitelist_ip: whitelist_ip || null,
            update_date: Date.now()
        });

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};


// Get settings page
exports.getSettings = async (req, res) => {
    try {
        let settings = await siteSetting.findOne();

        if (!settings) {
            // Create default settings if none exist
            settings = new siteSetting({
                site_title: 'Hindustan Latex Family Planning Promotion Trust',
                meta_title: 'Hindustan Latex Family Planning Promotion Trust',
                meta_description: 'Hindustan Latex Family Planning Promotion Trust'
            });
            await settings.save();
        }

        res.render('components/settings/index', {
            title: 'Site Settings',
            settings
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load settings'
        });
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    try {
        const {
            site_title, meta_title, meta_description, currency,
            office_address, office_city, office_latitude, office_longitude,
            time_zone, smtp_enable_status, sms_enable_status,
            smtp_email_content_type, smtp_encryption_type, smtp_from_mail,
            smtp_host, smtp_password, smtp_port, smtp_reply_mail,
            smtp_username, job_portal_link, website_link,
            organization_email_id, organization_mobile_no,
            organization_name, organization_whatsapp_no
        } = req.body;

        // Handle file uploads (logo and favicon)
        let logo_image = req.body.existing_logo;
        let fav_icon_image = req.body.existing_favicon;

        if (req.files) {
            if (req.files.logo_image) {
                logo_image = req.files.logo_image[0].filename;
            }
            if (req.files.fav_icon_image) {
                fav_icon_image = req.files.fav_icon_image[0].filename;
            }
        }

        await siteSetting.findOneAndUpdate({}, {
            site_title,
            meta_title,
            meta_description,
            logo_image,
            fav_icon_image,
            currency,
            office_address,
            office_city,
            office_latitude,
            office_longitude,
            time_zone,
            smtp_enable_status,
            sms_enable_status,
            smtp_email_content_type,
            smtp_encryption_type,
            smtp_from_mail,
            smtp_host,
            smtp_password,
            smtp_port,
            smtp_reply_mail,
            smtp_username,
            job_portal_link,
            website_link,
            organization_email_id,
            organization_mobile_no,
            organization_name,
            organization_whatsapp_no,
            updated_on: Date.now()
        }, { upsert: true });

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
};

// List all menus
exports.listMenus = async (req, res) => {
    try {
        const menus = await Menu.find().sort({ priority: 1 });
        const masters = await Menu.find({ type: 'Master' }).sort({ priority: 1 });

        res.render('components/menus/list', {
            title: 'Menu Management',
            menus,
            masters
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load menus'
        });
    }
};

// Add new menu
exports.addMenu = async (req, res) => {
    try {
        const { type, master_id, name, icon, url, priority, is_show } = req.body;
        console.log("all menus data", type, master_id, name, icon, url, priority, is_show)

        if (!name || !type || !priority) {
            return res.status(400).json({
                success: false,
                message: 'Name, type, and priority are required'
            });
        }

        const menu = new Menu({
            type,
            master_id: type !== 'Master' ? master_id : null,
            name,
            icon: icon || null,
            url: url || null,
            priority: Number.isInteger(parseInt(priority)) ? parseInt(priority) : 0,
            is_show: String(is_show).toLowerCase() === 'yes' || String(is_show).toLowerCase() === 'true'
        });

        await menu.save();
        res.json({ success: true, message: 'Menu created successfully' });

    } catch (error) {
        console.error('Error creating menu:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create menu'
        });
    }
};


// Update menu
exports.updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, master_id, name, icon, url, priority, is_show } = req.body;

        await Menu.findByIdAndUpdate(id, {
            type,
            master_id: type !== 'Master' ? master_id : null,
            name,
            icon: icon || null,
            url: url || null,
            priority: parseInt(priority),
            is_show: is_show === 'Yes',
            update_date: Date.now()
        });

        res.json({ success: true, message: 'Menu updated successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update menu'
        });
    }
};

// Delete menu
exports.deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if menu has submenus
        const hasSubmenus = await Menu.exists({ master_id: id });
        if (hasSubmenus) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete menu with submenus'
            });
        }

        // Remove menu assignments
        await MenuAssignment.deleteMany({ menu_id: id });

        // Delete menu
        await Menu.findByIdAndDelete(id);

        res.json({ success: true, message: 'Menu deleted successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete menu'
        });
    }
};

exports.listDesignations = async (req, res) => {
    try {
        const designations = await Designation.find().sort({ add_date: -1 });
        res.render('components/designations/list', {
            title: 'Designation Management',
            designations
        });
    } catch (error) {
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load designations'
        });
    }
};

// Add new designation
exports.addDesignation = async (req, res) => {
    try {
        const { name, description } = req.body;

        const designation = new Designation({
            name,
            description: description || '',
            status: 'Active'
        });

        await designation.save();
        res.json({ success: true, message: 'Designation created successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create designation'
        });
    }
};

// Update designation
exports.updateDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        await Designation.findByIdAndUpdate(id, {
            name,
            description: description || '',
            status,
            update_date: Date.now()
        });

        res.json({ success: true, message: 'Designation updated successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update designation'
        });
    }
};

// Delete designation
exports.deleteDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const hasUsers = await User.exists({ designation_id: id });
        if (hasUsers) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete designation with assigned users'
            });
        }

        // Remove menu assignments
        await MenuAssignment.deleteMany({ designation_id: id });

        // Delete designation
        await Designation.findByIdAndDelete(id);

        res.json({ success: true, message: 'Designation deleted successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete designation'
        });
    }
};

// GET: Menu Assignment Page

exports.menuAssignmentPage = async (req, res) => {
    try {
        const { id } = req.params;

        // 1️⃣ Fetch designation
        const designation = await Designation.findById(id).lean();
        if (!designation) {
            return res.status(404).render('error', {
                title: 'Not Found',
                error: 'Designation not found'
            });
        }

        // 2️⃣ Fetch all menus
        const menus = await Menu.find().sort({ priority: 1 }).lean();

        // 3️⃣ Fetch assigned menus for this designation
        const assignment = await MenuAssignment.findOne({ designation_id: id }).lean();
        const assignedMenuIds = assignment ? assignment.menu_id.map(m => m.toString()) : [];

        // 4️⃣ Render page with all data
        res.render('components/designations/assign-menu', {
            title: 'Assign Menu to Designation',
            designation,
            menus,
            assignedMenuIds
        });

    } catch (error) {
        console.error("Error loading menu assignment page:", error);
        res.status(500).render('error', {
            title: 'Error',
            error: 'Failed to load menu assignment page'
        });
    }
};


// PATCH Assign menus to a designation
exports.assignMenus = async (req, res) => {
    try {
        const { id } = req.params;
        let { menu_ids } = req.body;

        // Validate input
        if (!menu_ids) menu_ids = [];
        else if (!Array.isArray(menu_ids)) menu_ids = [menu_ids];

        // Convert to ObjectId
        const menuObjectIds = menu_ids.map(m => new mongoose.Types.ObjectId(m));

        // Update or create assignment
        const updated = await MenuAssignment.findOneAndUpdate(
            { designation_id: id },
            { $set: { menu_id: menuObjectIds, assigned_date: new Date() } },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, assignment: updated });
    } catch (error) {
        console.error("Error updating menu assignment:", error);
        res.status(500).json({ success: false, message: "Failed to update menu assignment" });
    }
};



//new 

// Render assign menu page
exports.getAssignMenuPage = async (req, res) => {
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

        res.render("menus/assign-menu", {
            designations,
            masterMenus,
            menuStructure,
            title: "E-Sangrah - Assign-Menu"
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
exports.getAssignedMenus = async (req, res) => {
    try {
        const { designation_id } = req.params;

        const assignedMenus = await menuAssignment.find({ designation_id })
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
exports.assignMenusToDesignation = async (req, res) => {
    try {
        const { designation_id, menu_ids } = req.body;

        if (!designation_id || !menu_ids) {
            return res.status(400).json({
                success: false,
                message: "Designation ID and menu IDs are required"
            });
        }

        // Remove existing assignments for this designation
        await menuAssignment.deleteMany({ designation_id });

        // Create new assignments
        const assignments = menu_ids.map(menu_id => ({
            designation_id,
            menu_id
        }));

        const savedAssignments = await menuAssignment.insertMany(assignments);

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

// Render menu list
exports.getMenuList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const menus = await Menu.find()
            .sort({ priority: 1, add_date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Menu.countDocuments();
        const totalPages = Math.ceil(total / limit);

        res.render("menus/list", {
            menus,
            currentPage: page,
            totalPages,
            total,
            limit,
            title: "E-Sangrah - Menu-list"
        });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render add menu form
exports.getAddMenu = async (req, res) => {
    try {
        const masters = await Menu.find({ type: "Master" }).sort({ name: 1 });
        res.render("menus/add", { masters });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render edit menu form
exports.getEditMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);
        const masters = await Menu.find({ type: "Master" }).sort({ name: 1 });

        if (!menu) {
            return res.status(404).render("error", { message: "Menu not found" });
        }

        res.render("menus/edit", { menu, masters });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};
