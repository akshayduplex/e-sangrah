import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Designation from "../../models/Designation.js";
import Department from "../../models/Departments.js";
import Document from "../../models/Document.js";
import Project from "../../models/Project.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
import checkPermissions from "../../middlewares/checkPermission.js";
const router = express.Router();

// Document List Page
router.get("/list", authenticate, checkPermissions, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/document/document-list", {
            title: "E-Sangrah - Documents-List",
            designations,
            user: req.user
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
router.get("/add", authenticate, checkPermissions, async (req, res) => {
    try {
        res.render("pages/add-document", {
            title: "E-Sangrah - Add-Document",
            user: req.user,
            isEdit: false
        });
    } catch (err) {
        console.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
});

router.get("/edit/:id", authenticate, checkPermissions, async (req, res) => {
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

        res.render("pages/add-document", {
            title: "E-Sangrah - Edit Document",
            user: req.user,
            document,
            isEdit: true,
            projectManager: document.projectManager, // send explicitly
            department: document.department // send explicitly
        });
    } catch (err) {
        console.error("Error loading edit-document page:", err);
        res.status(500).send("Server Error");
    }
});


export default router;
