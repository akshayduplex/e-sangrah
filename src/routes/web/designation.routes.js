import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import Designation from "../../models/Designation.js";

const router = express.Router();

// Render "Add Designation" page
router.get("/", authenticate, authorize("admin"), (req, res) => {
    res.render("pages/designation/designation", { designation: null });
});

// Render "Edit Designation" page
router.get("/edit/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);
        if (!designation) {
            req.flash("error", "Designation not found");
            return res.redirect("/designations/list");
        }
        res.render("pages/designation/designation", { designation });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/designations/list");
    }
});

// Render "Designation List" page
router.get("/list", authenticate, authorize("admin"), (req, res) => {
    res.render("pages/designation/designations-list", { title: "Designation List" });
});

export default router;
