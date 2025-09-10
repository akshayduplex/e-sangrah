import Menu from "../models/Menu.js";

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
        res.render("menu/list", {
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
        res.render("menu/add", { masters, menu: null });
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
        res.render("menu/add", { masters, menu });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};
