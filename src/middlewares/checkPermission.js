// middleware/rbac.js
import MenuAssignment from '../models/menuAssignment.js';
import Menu from '../models/Menu.js';

/**
 * RBAC Middleware based on request URL
 * Only allows access if the user's designation has the menu assigned.
 */
const checkPermissions = async (req, res, next) => {
    try {
        const user = req.user; // from auth middleware
        if (!user) return res.redirect('/login'); // redirect if not logged in

        // Superadmin bypass
        if (user.profile_type === 'superadmin') return next();

        if (!user.designation_id) {
            return res.status(403).render('403', {
                title: 'Access Denied',
                message: 'No designation assigned'
            });
        }

        // Match the menu by URL
        const url = req.baseUrl + req.path;
        const menu = await Menu.findOne({ url, is_show: true });
        if (!menu) return res.status(404).render('403', {
            title: 'Menu Not Found',
            message: 'Menu not found or inactive'
        });

        // Check if the menu is assigned to the user's designation
        const assignment = await MenuAssignment.findOne({
            designation_id: user.designation_id,
            menu_id: menu._id
        });

        if (!assignment) {
            return res.status(403).render("no-permission", {
                title: '403 - Forbidden',
                message: 'You don’t have permission to access this path on this server.',
            });
        }

        req.menu = menu;
        next();
    } catch (error) {
        console.error('RBAC middleware error:', error);
        res.status(500).render('no-permission', { title: 'Internal Server Error', message: error.message });
    }
};

export default checkPermissions;
