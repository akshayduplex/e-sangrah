// middleware/rbacMiddleware.js
import MenuAssignment from '../models/MenuAssignment.js';
import UserPermission from '../models/UserPermission.js';
import Menu from '../models/Menu.js';

/**
 * RBAC Middleware without console logs
 */
const checkPermissions = async (req, res, next) => {
    try {
        const user = req.user;
        const isApi = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');

        // 1. Authentication check
        if (!user) {
            if (isApi) return res.status(401).json({ error: 'Unauthorized' });
            return res.redirect('/login');
        }

        // 2. Superadmin/Admin bypass
        if (['superadmin', 'admin'].includes(user.profile_type)) {
            return next();
        }

        // 3. Normalize URL
        let url = req.originalUrl.split('?')[0];
        if (url.startsWith('/api')) url = url.substring(4);
        if (!url.startsWith('/')) url = '/' + url;
        url = url.replace(/\/[0-9a-fA-F]{24}/g, '/:id').replace(/\/\d+/g, '/:id');
        url = url.replace(/\/+$/, '') || '/';

        // 4. Find menu by normalized URL
        const menu = await Menu.findOne({ url: url, is_show: true });
        if (!menu) {
            if (isApi) {
                const allMenus = await Menu.find({ is_show: true }).select('url title type').lean();
                return res.status(404).json({
                    error: 'Menu not found or inactive',
                    debug: { requestedUrl: url, availableUrls: allMenus.map(m => m.url) }
                });
            }
            return res.status(404).render('error', {
                title: 'Menu Not Found',
                message: 'Menu not found or inactive'
            });
        }

        // 5. Determine required permission
        const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };
        const requiredPermission = methodMap[req.method] || 'read';

        // 6. Fetch permissions
        let designationPermission = null;
        if (user.userDetails?.designation) {
            designationPermission = await MenuAssignment.findOne({
                designation_id: user.userDetails.designation,
                menu_id: menu._id
            }).lean();
        }

        const userPermission = await UserPermission.findOne({
            user_id: user._id,
            menu_id: menu._id
        }).lean();

        // 7. Check AND condition
        const hasDesignationPermission = designationPermission?.permissions?.[requiredPermission] === true;
        const hasUserPermission = userPermission?.permissions?.[requiredPermission] === true;

        if (hasDesignationPermission && hasUserPermission) {
            return next();
        }

        // 8. Permission denied
        if (isApi) {
            return res.status(403).json({
                error: 'Forbidden: insufficient permissions',
                details: {
                    required: requiredPermission,
                    designation: hasDesignationPermission,
                    user: hasUserPermission
                }
            });
        }

        return res.status(403).render('no-permission', {
            title: '403 - Forbidden',
            message: 'You don\'t have permission to access this resource.'
        });

    } catch (error) {
        if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({
                error: 'Internal Server Error',
                details: error.message
            });
        }
        return res.status(500).render('error', {
            title: 'Internal Server Error',
            message: error.message
        });
    }
};

export default checkPermissions;
