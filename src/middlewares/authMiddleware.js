import User from "../models/User.js"; // note the .js extension

/**
 * Authentication middleware (checks session)
 */
export const authenticate = async (req, res, next) => {
    try {
        if (!req.session.user) {
            // If request is an API (starts with /api), return JSON
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({
                    success: false,
                    message: 'Access denied. Please log in.'
                });
            } else {
                // Redirect to login page
                return res.redirect('/login');
            }
        }

        // Fetch fresh user data from DB
        const user = await User.findById(req.session.user._id).select('-password');
        if (!user) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ success: false, message: 'User not found.' });
            } else {
                return res.redirect('/login');
            }
        }

        if (!user.isActive) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ success: false, message: 'Account is deactivated.' });
            } else {
                return res.redirect('/login');
            }
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ success: false, message: 'Authentication failed.' });
        } else {
            return res.redirect('/login');
        }
    }
};

/**
 * Authorization middleware (checks role from session)
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.session?.user?.role || 'unknown'} is not authorized`
            });
        }
        next();
    };
};
