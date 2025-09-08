import Menu from "../models/Menu.js";

// Render menu list
export const getMenuList = async (req, res) => {
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

        res.render("menu/list", {
            menus,
            currentPage: page,
            totalPages,
            total,
            limit,
        });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render add menu form
export const getAddMenu = async (req, res) => {
    try {
        const masters = await Menu.find({ type: "Master" }).sort({ name: 1 });
        res.render("menu/add", { masters });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};

// Render edit menu form
export const getEditMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);
        const masters = await Menu.find({ type: "Master" }).sort({ name: 1 });

        if (!menu) {
            return res.status(404).render("error", { message: "Menu not found" });
        }

        res.render("menu/edit", { menu, masters });
    } catch (error) {
        res.status(500).render("error", { message: error.message });
    }
};
