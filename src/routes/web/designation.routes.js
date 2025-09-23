import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import Designation from "../../models/Designation.js";
import checkPermissions from "../../middlewares/checkPermission.js";

const router = express.Router();

// Render "Add Designation" page
router.get("/", authenticate, authorize("admin"), checkPermissions, (req, res) => {
    res.render("pages/designation/designation", { designation: null, user: req.user });
});

// Render "Edit Designation" page
router.get("/edit/:id", authenticate, authorize("admin"), checkPermissions, async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);
        if (!designation) {
            req.flash("error", "Designation not found");
            return res.redirect("/designations/list");
        }
        res.render("pages/designation/designation", { designation, user: req.user });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/designations/list");
    }
});

// Render "Designation List" page
router.get("/list", authenticate, authorize("admin"), checkPermissions, (req, res) => {
    res.render("pages/designation/designations-list", { title: "Designation List", user: req.user });
});

export default router;
