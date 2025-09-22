import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import User from "../../models/User.js";

const router = express.Router();

// Register donor
router.get("/register", authenticate, async (req, res) => {
    try {
        const donor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/donor-registration", {
            title: donor ? "E-Sangrah - Edit Donor" : "E-Sangrah - Register",
            donor,
            isEdit: Boolean(donor),
        });
    } catch (err) {
        console.error("Error loading donor register page:", err);
        res.render("pages/donor-registration", { title: "E-Sangrah - Register", donor: null, isEdit: false });
    }
});

// Donor list
router.get("/list", authenticate, async (req, res) => {
    try {
        const donors = await User.find({ profile_type: "donor" }).lean();
        res.render("pages/donor-listing", { title: "E-Sangrah - Donor List", donors });
    } catch (err) {
        console.error("Error fetching donor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load donor list" });
    }
});

export default router;
