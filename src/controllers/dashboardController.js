import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";
import File from "../models/File.js";

const validPeriods = ["daily", "weekly", "monthly", "yearly"];

//Page controllers

// Render Dashboard page
export const showDashboard = (req, res) => {
    try {
        res.render("pages/dashboard/dashboard", {
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

// ------------------- Dashboard Stats -------------------
export const getDashboardStats = async (req, res) => {
    try {
        const user = req.user || req.session.user;
        const userId = new mongoose.Types.ObjectId(user._id);
        const userDepartment = user.department ? new mongoose.Types.ObjectId(user.department) : null;

        const documentStats = await Document.aggregate([
            {
                $match: {
                    $or: [
                        { owner: userId },
                        { sharedWithUsers: userId },
                        ...(userDepartment ? [{ department: userDepartment }] : [])
                    ]
                }
            },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const stats = { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 };

        documentStats.forEach(stat => {
            const key = stat._id?.toLowerCase();
            if (stats.hasOwnProperty(key)) stats[key] = stat.count;
            stats.total += stat.count;
        });

        return successResponse(res, stats, "Dashboard stats fetched successfully");
    } catch (err) {
        return errorResponse(res, err);
    }
};

export const getFileStatusRecentActivity = async (req, res) => {
    try {
        // Optional: Filter by user, department, project, etc.
        const { limit = 4, projectId, departmentId, userId } = req.query;

        const query = { status: "active" };

        if (projectId) query.projectId = projectId;
        if (departmentId) query.departmentId = departmentId;
        if (userId) query.uploadedBy = userId;

        const recentFiles = await File.find(query)
            .select("originalName version fileType status ")
            .sort({ uploadedAt: -1 })
            .limit(Number(limit))

        return res.status(200).json({
            success: true,
            count: recentFiles.length,
            data: recentFiles
        });
    } catch (error) {
        console.error("Error fetching recent file activity:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent file activity",
            error: error.message
        });
    }
};

/** Get Recent Activities */
export const getRecentActivities = async (req, res) => {
    try {
        const { documentId, limit = 10 } = req.query;

        if (!documentId) return res.status(400).json({ message: "documentId is required." });

        const document = await Document.findById(documentId)
            .populate("activityLog.user", "name email") // populate user details
            .select("activityLog");

        if (!document) return res.status(404).json({ message: "Document not found." });

        // Return latest `limit` activities
        const recentActivities = document.activityLog
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        res.status(200).json({ recentActivities });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


// ------------------- Document Type Uploads -------------------
export const getDocumentTypeUploads = async (req, res) => {
    try {
        const { period = "monthly" } = req.query;
        if (!validPeriods.includes(period)) {
            return failResponse(res, "Invalid period. Must be daily, weekly, monthly, or yearly", 400);
        }

        const startDate = calculateStartDate(period);

        const result = await Document.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: "$files" },
            {
                $lookup: {
                    from: "files",
                    localField: "files", // ✅ updated
                    foreignField: "_id",
                    as: "fileInfo"
                }
            },
            { $unwind: "$fileInfo" },
            { $group: { _id: "$fileInfo.extension", count: { $sum: 1 } } },
            { $group: { _id: null, total: { $sum: "$count" }, types: { $push: { type: "$_id", count: "$count" } } } },
            { $unwind: "$types" },
            {
                $project: {
                    _id: 0,
                    type: "$types.type",
                    percentage: { $round: [{ $multiply: [{ $divide: ["$types.count", "$total"] }, 100] }, 2] }
                }
            },
            { $sort: { percentage: -1 } }
        ]);

        return successResponse(res, result, `Document uploads for period "${period}" fetched successfully`);
    } catch (err) {
        return errorResponse(res, err);
    }
};

// ------------------- Documents Summary -------------------
export const getDocumentsSummary = async (req, res) => {
    try {
        const { period = "monthly", fileType } = req.query;
        if (!validPeriods.includes(period)) {
            return failResponse(res, "Invalid period. Must be daily, weekly, monthly, or yearly", 400);
        }

        const startDate = calculateStartDate(period);

        const pipeline = [
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: "$files" },
            {
                $lookup: {
                    from: "files",
                    localField: "files", // ✅ updated
                    foreignField: "_id",
                    as: "fileInfo"
                }
            },
            { $unwind: "$fileInfo" }
        ];

        if (fileType) {
            pipeline.push({ $match: { "fileInfo.extension": fileType.toLowerCase() } });
        }

        pipeline.push({ $group: { _id: "$status", count: { $sum: 1 } } });

        const docsByStatus = await Document.aggregate(pipeline);

        const summary = {
            totalDocs: docsByStatus.reduce((sum, d) => sum + d.count, 0),
            pendingDocs: docsByStatus.find(d => d._id === "Pending")?.count || 0,
            approvedDocs: docsByStatus.find(d => d._id === "Approved")?.count || 0,
            rejectedDocs: docsByStatus.find(d => d._id === "Rejected")?.count || 0
        };

        return successResponse(res, { period, fileType: fileType || "all", ...summary }, "Documents summary fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};
