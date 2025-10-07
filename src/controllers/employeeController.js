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
        const { status, department, createdAt } = req.query;

        const filter = {};

        if (status && status !== "All") filter.status = status;

        if (department && mongoose.Types.ObjectId.isValid(department))
            filter.department = department;

        if (createdAt) {
            // Parse DD-MM-YYYY (from your datepicker)
            const [day, month, year] = createdAt.split("-").map(Number);

            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const selectedDate = new Date(year, month - 1, day);

                // Match only documents where the DATE part of createdAt == selected date
                // (since Mongo stores with time, this ensures same date)
                const start = new Date(selectedDate.setHours(0, 0, 0, 0));
                const end = new Date(selectedDate.setHours(23, 59, 59, 999));
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

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
