import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";

//Page controllers

// Render Dashboard page
export const showEmployeeApprovalPage = (req, res) => {
    try {
        res.render("pages/employee/approval", {
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
 * Get all approval requests for managers/admin
 * GET /api/documents/approval-requests?status=&department=
 */
export const getApprovalRequests = async (req, res) => {
    try {
        const { status, department } = req.query;

        const filter = {};
        if (status && status !== "All") filter.status = status;
        if (department && mongoose.Types.ObjectId.isValid(department)) filter.department = department;

        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("owner", "name")
            .populate("projectManager", "name")
            .populate("files")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};