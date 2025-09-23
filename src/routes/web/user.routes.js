import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import Designation from "../../models/Designation.js";
import checkPermissions from "../../middlewares/checkPermission.js";

const router = express.Router();

// Users list
router.get("/list", authenticate, checkPermissions, (req, res) => {
    res.render("pages/register/user-listing", { title: "E-Sangrah - Users-List", user: req.user });
});

// Register new user
router.get("/register", authenticate, checkPermissions, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 }).lean();

        res.render("pages/register/user-registration", {
            title: "E-Sangrah - Register",
            departments,
            designations,
            user: req.user
        });
    } catch (err) {
        console.error("Error loading user registration:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Edit user
// router.get("/edit/:id", authenticate, checkPermissions, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id)
//             .populate("userDetails.department", "name")
//             .populate("userDetails.designation", "name")
//             .lean();

//         if (!user) return res.status(404).send("User not found");

//         const departments = await Department.find().lean();
//         const designations = await Designation.find().lean();

//         res.render("pages/register/user-edit", {
//             title: "E-Sangrah - Edit User",
//             user,
//             departments,
//             designations,
//         });
//     } catch (err) {
//         console.error("Error editing user:", err);
//         res.status(500).send("Internal Server Error");
//     }
// });
// View/Edit user (combined)
// Combined view/edit page
router.get("/:mode/:id", authenticate, checkPermissions, async (req, res) => {
    try {
        const { mode, id } = req.params;

        const user = await User.findById(id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        if (!user) return res.status(404).send("User not found");

        // Always send departments and designations for edit mode
        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        res.render("pages/register/user-form", {
            title: `User - ${user.name}`,
            user,
            departments,
            designations,
            viewOnly: mode === "view"
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});



export default router;
