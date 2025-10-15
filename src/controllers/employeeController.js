import mongoose from "mongoose";
import Document from "../models/Document.js";

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

export const showEmployeeRecycleBinPage = async (req, res) => {
    try {
        res.render("pages/employee/employeeRecycleBin", {
            user: req.user
        });
    } catch (err) {
        logger.error("Admin render error:", err);
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
        let { status, department, createdAt, page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {};

        if (status && status !== "All") filter.status = status;

        if (department && mongoose.Types.ObjectId.isValid(department)) {
            filter.department = department;
        }

        if (createdAt) {
            const [day, month, year] = createdAt.split("-").map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        const allowedFields = ['metadata.fileName', 'createdAt', 'department.name', 'projectManager.name', 'status', 'comment'];
        const sortObj = {};
        sortObj[allowedFields.includes(sortField) ? sortField : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            Document.find(filter)
                .populate("department", "name")
                .populate("owner", "name")
                .populate("projectManager", "name")
                .populate("files")
                .sort(sortObj)
                .skip(skip)
                .limit(limit),
            Document.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: documents,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error("Error in getApprovalRequests:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
