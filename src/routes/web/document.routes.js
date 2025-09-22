import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Designation from "../../models/Designation.js";
import Department from "../../models/Departments.js";
import Document from "../../models/Document.js";
import Project from "../../models/Project.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
const router = express.Router();

// Document List Page
router.get("/list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/document/document-list", {
            title: "E-Sangrah - Documents-List",
            designations,
        });
    } catch (err) {
        console.error("Error loading document list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load documents",
        });
    }
});
// Add Document Page
router.get("/add", authenticate, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const users = await User.find({ profile_type: "user" }, "name").sort({ name: 1 }).lean();
        const projectNames = await Project.find({ isActive: true, projectStatus: "Active" }, "projectName").lean();

        res.render("pages/add-document", {
            title: "E-Sangrah - Add-Document",
            departments,
            users,
            projectNames,
            isEdit: false
        });
    } catch (err) {
        console.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
});

router.get("/edit/:id", authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid document ID");
        }

        const document = await Document.findById(id)
            .populate("department", "name")
            .populate("project", "projectName")
            .populate("owner", "name email")
            .lean();

        if (!document) {
            return res.status(404).send("Document not found");
        }

        // Fetch dropdown data (same as add page)
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const users = await User.find({ profile_type: "user" }, "name").sort({ name: 1 }).lean();
        const projectNames = await Project.find({ isActive: true, projectStatus: "Active" }, "projectName").lean();

        res.render("pages/add-document", {
            title: "E-Sangrah - Edit Document",
            departments,
            users,
            projectNames,
            document,  // <-- pass existing document for prefill
            isEdit: true  // <-- flag to differentiate add vs edit
        });
    } catch (err) {
        console.error("Error loading edit-document page:", err);
        res.status(500).send("Server Error");
    }
});


export default router;
