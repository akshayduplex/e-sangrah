// // middleware/rbacMiddleware.js
// import UserPermission from '../models/UserPermission.js';
// import Menu from '../models/Menu.js';
// import MenuAssignment from '../models/menuAssignment.js';

import Menu from "../models/Menu.js";
import MenuAssignment from "../models/MenuAssignment.js";
import UserPermission from "../models/UserPermission.js";

// /**
//  * RBAC Middleware without console logs
//  */
// const checkPermissions = async (req, res, next) => {
//     try {
//         const user = req.user;
//         const isApi = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');

//         // 1. Authentication check
//         if (!user) {
//             if (isApi) return res.status(401).json({ error: 'Unauthorized' });
//             return res.redirect('/login');
//         }

//         // 2. Superadmin/Admin bypass
//         if (['superadmin', 'admin'].includes(user.profile_type)) {
//             return next();
//         }

//         // 3. Normalize URL
//         let url = req.originalUrl.split('?')[0];
//         if (url.startsWith('/api')) url = url.substring(4);
//         if (!url.startsWith('/')) url = '/' + url;
//         url = url.replace(/\/[0-9a-fA-F]{24}/g, '/:id').replace(/\/\d+/g, '/:id');
//         url = url.replace(/\/+$/, '') || '/';

//         // 4. Find menu by normalized URL
//         const menu = await Menu.findOne({ url: url, is_show: true });
//         if (!menu) {
//             if (isApi) {
//                 const allMenus = await Menu.find({ is_show: true }).select('url title type').lean();
//                 return res.status(404).json({
//                     error: 'Menu not found or inactive',
//                     debug: { requestedUrl: url, availableUrls: allMenus.map(m => m.url) }
//                 });
//             }
//             return res.status(404).render('error', {
//                 title: 'Menu Not Found',
//                 message: 'Menu not found or inactive'
//             });
//         }

//         // 5. Determine required permission
//         const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };
//         const requiredPermission = methodMap[req.method] || 'read';

//         // 6. Fetch permissions
//         let designationPermission = null;
//         if (user.userDetails?.designation) {
//             designationPermission = await MenuAssignment.findOne({
//                 designation_id: user.userDetails.designation,
//                 menu_id: menu._id
//             }).lean();
//         }

//         const userPermission = await UserPermission.findOne({
//             user_id: user._id,
//             menu_id: menu._id
//         }).lean();

//         // 7. Check AND condition
//         const hasDesignationPermission = designationPermission?.permissions?.[requiredPermission] === true;
//         const hasUserPermission = userPermission?.permissions?.[requiredPermission] === true;

//         if (hasDesignationPermission && hasUserPermission) {
//             return next();
//         }

//         // 8. Permission denied
//         if (isApi) {
//             return res.status(403).json({
//                 error: 'Forbidden: insufficient permissions',
//                 details: {
//                     required: requiredPermission,
//                     designation: hasDesignationPermission,
//                     user: hasUserPermission
//                 }
//             });
//         }

//         return res.status(403).render('no-permission', {
//             title: '403 - Forbidden',
//             message: 'You don\'t have permission to access this resource.'
//         });

//     } catch (error) {
//         if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
//             return res.status(500).json({
//                 error: 'Internal Server Error',
//                 details: error.message
//             });
//         }
//         return res.status(500).render('error', {
//             title: 'Internal Server Error',
//             message: error.message
//         });
//     }
// };

// export default checkPermissions;

// import UserPermission from '../models/UserPermission.js';
// import Menu from '../models/Menu.js';
// import MenuAssignment from '../models/MenuAssignment.js';

// // In-memory caches
// let urlMenuMap = {};
// let userPermissionsCache = {};
// let designationUserMap = {};

// // Global permissions version
// let globalPermissionsVersion = 1;

// // Increment version and invalidate affected users
// export const incrementGlobalPermissionsVersion = (designationId) => {
//     if (designationId && designationUserMap[designationId]) {
//         designationUserMap[designationId].forEach(userId => {
//             if (userPermissionsCache[userId]) {
//                 userPermissionsCache[userId]._version = 0; // force refresh
//             }
//         });
//     } else {
//         // fallback: invalidate all users
//         Object.keys(userPermissionsCache).forEach(userId => {
//             userPermissionsCache[userId]._version = 0;
//         });
//     }
// };

// // Load all menus into memory
// export const loadMenuMap = async () => {
//     const menus = await Menu.find({ is_show: true }).lean();
//     urlMenuMap = {};
//     menus.forEach(menu => {
//         const normalized = menu.url
//             .replace(/\/[0-9a-fA-F]{24}/g, '/:id')
//             .replace(/\/\d+/g, '/:id')
//             .replace(/\/+$/, '') || '/';
//         urlMenuMap[normalized] = menu;
//     });
// };

// // Normalize URL helper
// const normalizeUrl = (url) => {
//     url = url.split('?')[0];
//     if (url.startsWith('/api')) url = url.substring(4);
//     if (!url.startsWith('/')) url = '/' + url;
//     url = url.replace(/\/[0-9a-fA-F]{24}/g, '/:id').replace(/\/\d+/g, '/:id');
//     url = url.replace(/\/+$/, '') || '/';
//     return url;
// };

// // HTTP method -> permission mapping
// const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };

// // Fetch permissions from DB if not cached
// const fetchUserPermissions = async (userId, designationId, menuId) => {
//     const [designationPermission, userPermission] = await Promise.all([
//         MenuAssignment.findOne({ designation_id: designationId, menu_id: menuId }).lean(),
//         UserPermission.findOne({ user_id: userId, menu_id: menuId }).lean()
//     ]);

//     return {
//         designation: designationPermission?.permissions || {},
//         user: userPermission?.permissions || {}
//     };
// };

// // Main RBAC middleware
// const checkPermissions = async (req, res, next) => {
//     try {
//         const user = req.user || req.session.user;
//         const isApi = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');

//         if (!user) {
//             if (isApi) return res.status(401).json({ error: 'Unauthorized' });
//             return res.redirect('/login');
//         }

//         // Superadmin/Admin bypass
//         if (['superadmin', 'admin'].includes(user.profile_type)) {
//             return next();
//         }

//         const userId = user._id.toString();
//         const designationId = user.userDetails.designation?.toString();

//         //Maintain designation-user map
//         if (designationId) {
//             designationUserMap[designationId] = designationUserMap[designationId] || new Set();
//             designationUserMap[designationId].add(userId);
//         }

//         // Normalize URL and get menu
//         const url = normalizeUrl(req.originalUrl);
//         const menu = urlMenuMap[url];
//         if (!menu) {
//             if (isApi) return res.status(404).json({ error: 'Menu not found or inactive', requestedUrl: url });
//             return res.status(404).render('error', { title: 'Menu Not Found', message: 'Menu not found or inactive' });
//         }

//         const menuId = menu._id.toString();
//         const requiredPermission = methodMap[req.method] || 'read';

//         // Initialize cache for user if needed
//         userPermissionsCache[userId] = userPermissionsCache[userId] || {};
//         userPermissionsCache[userId]._version = userPermissionsCache[userId]._version || 0;

//         // Refresh cache if missing or version mismatch
//         if (!userPermissionsCache[userId][menuId] || userPermissionsCache[userId]._version !== globalPermissionsVersion) {
//             userPermissionsCache[userId][menuId] = await fetchUserPermissions(userId, designationId, menuId);
//             userPermissionsCache[userId]._version = globalPermissionsVersion;
//         }

//         const perms = userPermissionsCache[userId][menuId];

//         //Allow if either designation OR user override has permission
//         const hasPermission = !!(perms.designation[requiredPermission] || perms.user[requiredPermission]);

//         if (hasPermission) {
//             return next();
//         }

//         // Permission denied
//         if (isApi) return res.status(403).json({ error: 'Forbidden', required: requiredPermission });
//         return res.status(403).render('no-permission', { title: '403 - Forbidden', message: 'You do not have permission.' });

//     } catch (error) {
//         if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
//             return res.status(500).json({ error: 'Internal Server Error', details: error.message });
//         }
//         return res.status(500).render('error', { title: 'Internal Server Error', message: error.message });
//     }
// };

// export default checkPermissions;

// Normalize URL helper
const normalizeUrl = (url) => {
    url = url.split('?')[0];
    if (url.startsWith('/api')) url = url.substring(4);
    if (!url.startsWith('/')) url = '/' + url;
    url = url.replace(/\/[0-9a-fA-F]{24}/g, '/:id').replace(/\/\d+/g, '/:id');
    url = url.replace(/\/+$/, '') || '/';
    return url;
};

// HTTP method → permission mapping
const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };

// Fetch permissions directly from DB (no caching)
const fetchUserPermissions = async (userId, designationId, menuId) => {
    const [designationPermission, userPermission] = await Promise.all([
        MenuAssignment.findOne({ designation_id: designationId, menu_id: menuId }).lean(),
        UserPermission.findOne({ user_id: userId, menu_id: menuId }).lean()
    ]);

    return {
        designation: designationPermission?.permissions || {},
        user: userPermission?.permissions || {}
    };
};

// Main RBAC middleware — no caching
const checkPermissions = async (req, res, next) => {
    try {
        console.log('--- CHECK PERMISSIONS START ---');
        console.log('Original URL:', req.originalUrl);
        console.log('Request Method:', req.method);
        console.log('User from req.user:', req.user);
        console.log('User from req.session:', req.session?.user);

        const user = req.user || req.session.user;
        const isApi = req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json');

        if (!user) {
            console.log('❌ No user found — redirecting or returning 401');
            if (isApi) return res.status(401).json({ error: 'Unauthorized' });
            return res.redirect('/login');
        }

        console.log('User profile type:', user.profile_type);

        // Superadmin/Admin bypass
        if (['superadmin', 'admin'].includes(user.profile_type)) {
            console.log('✅ Admin/Superadmin bypassing permission check');
            return next();
        }

        const userId = user._id.toString();
        const designationId = user.userDetails.designation?.toString();
        console.log('User ID:', userId);
        console.log('Designation ID:', designationId);

        // Normalize URL
        const url = normalizeUrl(req.originalUrl);
        console.log('Normalized URL:', url);

        // Load menu directly from DB (no caching)
        const menu = await Menu.findOne({
            is_show: true,
            $or: [
                { url },
                { url: url.replace(/\/:id/g, '/:id') } // Fallback match
            ]
        }).lean();

        if (!menu) {
            console.log('❌ No menu found for URL:', url);
            if (isApi) return res.status(404).json({ error: 'Menu not found or inactive', requestedUrl: url });
            return res.status(404).render('error', { title: 'Menu Not Found', message: 'Menu not found or inactive' });
        }

        const menuId = menu._id.toString();
        const requiredPermission = methodMap[req.method] || 'read';
        console.log('Menu ID:', menuId);
        console.log('Required Permission:', requiredPermission);

        // Fetch permissions directly from DB
        console.log('🔄 Fetching permissions from DB for user:', userId, 'menu:', menuId);
        const perms = await fetchUserPermissions(userId, designationId, menuId);
        console.log('Fetched permissions:', JSON.stringify(perms, null, 2));

        // Allow if either designation OR user override has permission
        const hasPermission = !!(perms.designation[requiredPermission] || perms.user[requiredPermission]);
        console.log('Permission check result:', hasPermission ? '✅ ALLOWED' : '❌ DENIED');

        if (hasPermission) {
            console.log('--- CHECK PERMISSIONS END (Allowed) ---');
            return next();
        }

        // Permission denied
        console.log('❌ User lacks required permission:', requiredPermission);
        if (isApi) return res.status(403).json({ error: 'Forbidden', required: requiredPermission });
        return res.status(403).render('no-permission', { title: '403 - Forbidden', message: 'You do not have permission.' });

    } catch (error) {
        console.error('💥 Error in checkPermissions:', error);
        if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
        return res.status(500).render('error', { title: 'Internal Server Error', message: error.message });
    }
};

export default checkPermissions;