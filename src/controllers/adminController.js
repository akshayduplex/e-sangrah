import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";
import Approval from "../models/Approval.js";

//Page controllers

// Render Dashboard page
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


//API Controllers

/**
 * Get documents submitted by current user (My Approvals)
 * GET /api/documents/my-approvals
 */
export const getMyApprovals = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, department, createdAt } = req.query;

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

        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("documentDonor", "name")
            .populate("files")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        console.error("Error in getMyApprovals:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};