import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";

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


//API Controllers

/**
 * Get documents submitted by current user (My Approvals)
 * GET /api/documents/my-approvals
 */
export const getMyApprovals = async (req, res) => {
    try {
        const userId = req.user._id; // assuming you have user auth middleware

        const documents = await Document.find({ owner: userId })
            .populate("department", "name")
            .populate("projectManager", "name")
            .populate("documentDonor", "name")
            .populate("documentVendor", "name")
            .populate("files")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};