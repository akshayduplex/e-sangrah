import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import Designation from "../../models/Designation.js";

const router = express.Router();

// Users list
router.get("/list", authenticate, (req, res) => {
    res.render("pages/register/user-listing", { title: "E-Sangrah - Users-List" });
});

// Register new user
router.get("/register", authenticate, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 }).lean();

        res.render("pages/register/user-registration", {
            title: "E-Sangrah - Register",
            departments,
            designations,
        });
    } catch (err) {
        console.error("Error loading user registration:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Edit user
router.get("/edit/:id", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        if (!user) return res.status(404).send("User not found");

        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        res.render("pages/register/user-edit", {
            title: "E-Sangrah - Edit User",
            user,
            departments,
            designations,
        });
    } catch (err) {
        console.error("Error editing user:", err);
        res.status(500).send("Internal Server Error");
    }
});

export default router;
