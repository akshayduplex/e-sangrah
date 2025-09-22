import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Department from "../../models/Departments.js";

const router = express.Router();

// Add Department Form
router.get("/", authenticate, (req, res) => {
    res.render("pages/department/department", {
        title: "E-Sangrah - Department",
        department: null,
    });
});

// Department List Page
router.get("/list", authenticate, (req, res) => {
    res.render("pages/department/departments-list", {
        title: "E-Sangrah - Departments-List",
    });
});

// Edit Department Form
router.get("/edit/:id", authenticate, async (req, res) => {
    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.redirect("/departments/list");

    res.render("pages/department/department", {
        title: "E-Sangrah - Edit Department",
        department,
    });
});

export default router;
