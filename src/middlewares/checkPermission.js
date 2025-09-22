// // middleware/rbac.js
// import MenuAssignment from '../models/menuAssignment.js';
// import Menu from '../models/Menu.js';

// /**
//  * RBAC Middleware based on request URL
//  * Only allows access if the user's designation has the menu assigned.
//  */
// const checkPermissions = async (req, res, next) => {
//     try {
//         const user = req.user; // from auth middleware
//         if (!user) return res.redirect('/login'); // redirect if not logged in

//         // Superadmin bypass
//         if (user.profile_type === 'superadmin') return next();

//         if (!user.designation_id) {
//             return res.status(403).render('403', {
//                 title: 'Access Denied',
//                 message: 'No designation assigned'
//             });
//         }

//         // Match the menu by URL
//         const url = req.baseUrl + req.path;
//         const menu = await Menu.findOne({ url, is_show: true });
//         if (!menu) return res.status(404).render('403', {
//             title: 'Menu Not Found',
//             message: 'Menu not found or inactive'
//         });

//         // Check if the menu is assigned to the user's designation
//         const assignment = await MenuAssignment.findOne({
//             designation_id: user.designation_id,
//             menu_id: menu._id
//         });

//         if (!assignment) {
//             return res.status(403).render("no-permission", {
//                 title: '403 - Forbidden',
//                 message: 'You don’t have permission to access this path on this server.',
//             });
//         }

//         req.menu = menu;
//         next();
//     } catch (error) {
//         console.error('RBAC middleware error:', error);
//         res.status(500).render('no-permission', { title: 'Internal Server Error', message: error.message });
//     }
// };

// export default checkPermissions;


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
        console.log('🔹 RBAC Middleware Start');
        console.log('User from request:', user);

        if (!user) {
            console.log('❌ No user found, redirecting to /login');
            return res.redirect('/login');
        }

        // Superadmin/Admin bypass
        if (user.profile_type === 'superadmin' || user.profile_type === 'admin') {
            console.log('✅ User is superadmin/admin, bypassing RBAC');
            return next();
        }

        // Normalize URL: remove leading and trailing slash
        let url = (req.baseUrl + req.path).replace(/\/+$/, '');
        if (url.startsWith('/')) url = url.slice(1);
        console.log('Normalized URL for menu search:', url);

        // Find menu
        const menu = await Menu.findOne({ url, is_show: true });
        if (!menu) {
            console.log('❌ Menu not found for URL:', url);
            return res.status(404).render('error', {
                title: 'Menu Not Found',
                message: 'Menu not found or inactive'
            });
        }
        console.log('✅ Menu found:', menu.name, menu._id);

        // Determine required permission
        const methodMap = { GET: 'read', POST: 'write', PUT: 'write', PATCH: 'write', DELETE: 'delete' };
        const requiredPermission = methodMap[req.method] || 'read';
        console.log('Required permission for this request:', requiredPermission);

        // 1️⃣ Check designation permission (highest priority)
        let designationPermission = null;
        if (user.userDetails && user.userDetails.designation) {
            designationPermission = await MenuAssignment.findOne({
                designation_id: user.userDetails.designation,
                menu_id: menu._id
            });
            console.log('DesignationPermission found:', designationPermission);

            if (designationPermission) {
                if (designationPermission.permissions[requiredPermission] === true) {
                    console.log('✅ Access granted by designation permission');
                    return next();
                } else {
                    console.log('❌ Access denied by designation permission (highest priority)');
                    return res.status(403).render('no-permission', {
                        title: '403 - Forbidden',
                        message: 'You don\'t have permission to access this resource.'
                    });
                }
            }
        }

        // 2️⃣ If no designation permission exists, check user-specific permission
        const userPermission = await UserPermission.findOne({
            user_id: user._id,
            menu_id: menu._id
        });
        console.log('UserPermission found:', userPermission);

        if (userPermission?.permissions?.[requiredPermission] === true) {
            console.log('✅ Access granted by user-specific permission');
            return next();
        }

        // 3️⃣ If neither grants access
        console.log('❌ No permission found for user on this menu');
        return res.status(403).render('no-permission', {
            title: '403 - Forbidden',
            message: 'You don\'t have permission to access this resource.'
        });

    } catch (error) {
        console.error('RBAC middleware error:', error);
        res.status(500).render('no-permission', {
            title: 'Internal Server Error',
            message: error.message
        });
    } finally {
        console.log('🔹 RBAC Middleware End\n');
    }
};



export default checkPermissions;

// import UserPermission from "../models/UserPermission.js";
// import Menu from "../models/Menu.js";
// import MenuAssignment from "../models/menuAssignment.js";

// /**
//  * RBAC Middleware for per-user permission checking
//  * Checks the UserPermission first, then falls back to designation (MenuAssignment)
//  */
// const checkUserPermission = async (req, res, next) => {
//     try {
//         const user = req.user;
//         if (!user) return res.redirect("/login");
//         console.log("checkpermissioon", req.user)
//         // Superadmin bypass
//         if (user.profile_type === "superadmin" || user.profile_type === "admin") return next();

//         // Match menu by URL
//         const url = req.baseUrl + req.path;
//         console.log("URL in middleware:", url);
//         const menu = await Menu.findOne({ url, is_show: true });
//         console.log("Menu in middleware:", menu);
//         if (!menu) {
//             return res.status(404).render("no-permission", {
//                 title: "Menu Not Found",
//                 message: "Menu not found or inactive",
//             });
//         }

//         // Determine required permission based on HTTP method
//         let requiredPermission;
//         switch (req.method) {
//             case "GET":
//                 requiredPermission = "read";
//                 break;
//             case "POST":
//             case "PUT":
//             case "PATCH":
//                 requiredPermission = "write";
//                 break;
//             case "DELETE":
//                 requiredPermission = "delete";
//                 break;
//             default:
//                 requiredPermission = "read";
//         }

//         // 1️⃣ Check UserPermission
//         const userPerm = await UserPermission.findOne({
//             user_id: user._id,
//             menu_id: menu._id,
//         });

//         if (userPerm && userPerm.permissions[requiredPermission]) {
//             return next();
//         }

//         // 2️⃣ Fall back to MenuAssignment (designation-level)
//         if (user.designation_id) {
//             const designationPerm = await MenuAssignment.findOne({
//                 designation_id: user.designation_id,
//                 menu_id: menu._id,
//             });

//             if (designationPerm && designationPerm.permissions[requiredPermission]) {
//                 return next();
//             }
//         }

//         // No permission
//         return res.status(403).render("no-permission", {
//             title: "403 - Forbidden",
//             message: "You don’t have permission to access this resource.",
//         });

//     } catch (error) {
//         console.error("RBAC middleware error:", error);
//         return res.status(500).render("no-permission", {
//             title: "Internal Server Error",
//             message: error.message,
//         });
//     }
// };

// export default checkUserPermission;
