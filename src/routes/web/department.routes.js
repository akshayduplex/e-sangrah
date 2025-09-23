import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Department from "../../models/Departments.js";
import checkPermissions from "../../middlewares/checkPermission.js";

const router = express.Router();

// Add Department Form
router.get("/", authenticate, checkPermissions, (req, res) => {
    res.render("pages/department/department", {
        title: "E-Sangrah - Department",
        user: req.user,
        department: null,
    });
});

// Department List Page
router.get("/list", authenticate, checkPermissions, (req, res) => {
    res.render("pages/department/departments-list", {
        title: "E-Sangrah - Departments-List",
        user: req.user
    });
});

// Edit Department Form
router.get("/edit/:id", authenticate, checkPermissions, async (req, res) => {
    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.redirect("/departments/list");

    res.render("pages/department/department", {
        title: "E-Sangrah - Edit Department",
        department,
        user: req.user
    });
});

export default router;
