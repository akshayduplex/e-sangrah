import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import User from "../../models/User.js";

const router = express.Router();

// Register vendor
router.get("/register", authenticate, async (req, res) => {
    try {
        const vendor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/vendor-registration", {
            title: vendor ? "E-Sangrah - Edit Vendor" : "E-Sangrah - Register",
            vendor,
            isEdit: Boolean(vendor),
        });
    } catch (err) {
        console.error("Error loading vendor register page:", err);
        res.render("pages/vendor-registration", { title: "E-Sangrah - Register", vendor: null, isEdit: false });
    }
});

// Vendor list
router.get("/list", authenticate, async (req, res) => {
    try {
        const vendors = await User.find({ profile_type: "vendor" }).lean();
        res.render("pages/vendor-registration-list", { title: "E-Sangrah - Vendor List", vendors });
    } catch (err) {
        console.error("Error fetching vendor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load vendor list" });
    }
});

export default router;
