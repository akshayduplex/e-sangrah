import mongoose from "mongoose";
import Document from "../models/Document.js";
import logger from "../utils/logger.js";
import Designation from "../models/Designation.js";
import Folder from "../models/Folder.js";

//Page controllers

// Render Dashboard page
export const showAdminDashboardPage = (req, res) => {
    try {
        res.render("pages/admin/adminDashboard", {
            title: " Admin Dashboard",
            user: req.user
        });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};
export const showAdminApprovalPage = (req, res) => {
    try {
        res.render("pages/admin/approval", {
            user: req.user
        });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};

export const showApprovalTrackPage = async (req, res) => {
    try {
        const documentId = req.params.id;

        res.render('pages/admin/approval-tracking', {
            documentId: documentId,
            user: req.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/admin/approval-tracking', {
            document: null,
            approvals: [],
            user: req.user
        });
    }
};

export const showRecycleBinPage = async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/admin/adminRecycleBin", {
            user: req.user,
            designations
        });
    } catch (err) {
        logger.error("Admin render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};

export const showManageAccessPage = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { userEmail } = req.query;
        const owner = req.user;
        if (!folderId || !owner) {
            return res.status(400).send("Invalid request");
        }

        const folder = await Folder.findById(folderId)
            .populate("owner", "name email")
            .populate("permissions.principal", "name email");

        if (!folder) return res.status(404).send("Folder not found");

        // Only owner can manage access
        if (folder.owner._id.toString() !== owner._id.toString()) {
            return res.status(403).send("Not authorized");
        }

        res.render("pages/admin/manage-access", {
            folder,
            user: req.user,
            userEmail
        });

    } catch (err) {
        logger.error("Admin render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load manage access page"
        });
    }
};
//API Controllers

/**
 * Get documents submitted by current user (My Approvals)
 * GET /api/documents/my-approvals
 */
export const getMyApprovals = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            status,
            department,
            createdAt,
            page = 1,
            limit = 10,
            sortField = "createdAt",
            sortOrder = "desc"
        } = req.query;

        const filter = { owner: userId };

        // Status filter
        if (status && status !== "All") filter.status = status;

        // Department filter
        if (department && mongoose.Types.ObjectId.isValid(department))
            filter.department = department;

        // Date filter
        if (createdAt) {
            const [day, month, year] = createdAt.split("-").map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Sorting
        const sortObj = {};
        const order = sortOrder === "asc" ? 1 : -1;

        // Validate sortField to avoid injection
        const allowedFields = [
            "metadata.fileName",
            "createdAt",
            "documentDonor.name",
            "department.name",
            "status",
            "comment"
        ];
        if (allowedFields.includes(sortField)) {
            sortObj[sortField] = order;
        } else {
            sortObj["createdAt"] = -1;
        }

        const [documents, total] = await Promise.all([
            Document.find(filter)
                .populate("department", "name")
                .populate("documentDonor", "name")
                .populate("files")
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit)),
            Document.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: documents,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error("Error in getMyApprovals:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

