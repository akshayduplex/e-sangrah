// middleware/rbac.js
import MenuAssignment from '../models/menuAssignment.js';
import UserPermission from '../models/UserPermission.js';
import Menu from '../models/Menu.js';

/**
 * RBAC Middleware based on request URL and HTTP method
 */
const checkPermissions = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect('/login');
        }

        // Superadmin/Admin bypass
        if (user.profile_type === 'superadmin' || user.profile_type === 'admin') {
            return next();
        }

        // Normalize URL
        let url = (req.baseUrl + req.path).replace(/\/+$/, '');
        if (url.startsWith('/')) url = url.slice(1);

        // Find menu
        const menu = await Menu.findOne({ url, is_show: true });
        if (!menu) {
            return res.status(404).render('error', {
                title: 'Menu Not Found',
                message: 'Menu not found or inactive'
            });
        }

        // Determine required permission
        const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };
        const requiredPermission = methodMap[req.method] || 'read';

        // Fetch both designation & user-specific permissions
        let designationPermission = null;
        if (user.userDetails?.designation) {
            designationPermission = await MenuAssignment.findOne({
                designation_id: user.userDetails.designation,
                menu_id: menu._id
            });
        }

        const userPermission = await UserPermission.findOne({
            user_id: user._id,
            menu_id: menu._id
        });

        // ✅ Enforce AND condition
        if (
            designationPermission?.permissions?.[requiredPermission] === true &&
            userPermission?.permissions?.[requiredPermission] === true
        ) {
            return next();
        }

        return res.status(403).render('no-permission', {
            title: '403 - Forbidden',
            message: 'You don\'t have permission to access this resource.'
        });

    } catch (error) {
        res.status(500).render('no-permission', {
            title: 'Internal Server Error',
            message: error.message
        });
    } finally {
        console.log(`${req.method} ${req.originalUrl} - User: ${req.user ? req.user.email : 'Guest'}`);
    }
};




export default checkPermissions;