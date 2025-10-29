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
        const profileType = user.profile_type;

        const matchConditions = [
            { isDeleted: { $ne: true } },
            { isArchived: { $ne: true } }
        ];

        if (profileType !== "superadmin") {
            const accessConditions = [
                { owner: userId },
                { sharedWithUsers: userId }
            ];
            if (userDepartment) accessConditions.push({ department: userDepartment });

            matchConditions.push({ $or: accessConditions });
        }

        const documentStats = await Document.aggregate([
            {
                $match: { $and: matchConditions }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 };

        documentStats.forEach(stat => {
            const key = stat._id?.toLowerCase();
            if (stats.hasOwnProperty(key)) stats[key] = stat.count;
            stats.total += stat.count;
        });

        return successResponse(res, stats, "Dashboard stats fetched successfully");
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        return errorResponse(res, err, "Failed to fetch dashboard stats");
    }
};

export const getFileStatus = async (req, res) => {
    try {
        const { limit = 4, projectId, departmentId, userId } = req.query;

        const query = { status: "active" };

        if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
        if (departmentId) query.departmentId = new mongoose.Types.ObjectId(departmentId);
        if (userId) query.uploadedBy = new mongoose.Types.ObjectId(userId);

        // NOTE: Added 'fileSize' and populated 'uploadedBy' user to provide a richer response
        const recentFiles = await File.find(query)
            .select("originalName version fileType status fileSize uploadedAt")
            .populate("uploadedBy", "name") // Assuming User model has a 'name' field
            .sort({ uploadedAt: -1 })
            .limit(Number(limit));

        return res.status(200).json({
            success: true,
            count: recentFiles.length,
            data: recentFiles
        });
    } catch (error) {
        console.error("Error fetching recent file status:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent file status",
            error: error.message
        });
    }
};

/** Get Recent Activities */
export const getRecentActivities = async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const userId = req.user?._id;
        const profile_type = req.user?.profile_type;


        const matchStage = {
            isDeleted: false,
            isArchived: false
        };

        if (profile_type !== "superadmin") {
            matchStage.$or = [
                { owner: userId },
                { sharedWithUsers: userId }
            ];
        }

        const recentActivities = await Document.aggregate([

            { $match: matchStage },


            { $unwind: "$versionHistory" },


            { $sort: { "versionHistory.timestamp": -1 } },


            { $limit: Number(limit) },

            {
                $lookup: {
                    from: "users",
                    localField: "versionHistory.changedBy",
                    foreignField: "_id",
                    as: "changedByUser"
                }
            },

            { $unwind: { path: "$changedByUser", preserveNullAndEmptyArrays: true } },


            {
                $project: {
                    _id: 0,
                    documentId: "$_id",
                    documentName: "$metadata.fileName",
                    activity: "$versionHistory.changes",
                    timestamp: "$versionHistory.timestamp",
                    userName: "$changedByUser.name",
                    userId: "$changedByUser._id",
                    version: "$versionHistory.version"
                }
            }
        ]);

        res.status(200).json({ recentActivities });
    } catch (error) {
        console.error("Error fetching recent activities:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// More efficient version with fewer stages
export const getDepartmentDocumentUploads = async (req, res) => {
    try {
        const { period = "monthly" } = req.query;

        if (!validPeriods.includes(period)) {
            return failResponse(res, "Invalid period. Must be daily, weekly, monthly, or yearly", 400);
        }

        const startDate = calculateStartDate(period);

        const pipeline = [
            {
                $match: {
                    createdAt: { $gte: startDate },
                    isDeleted: false,
                    department: { $exists: true, $ne: null }
                }
            },

            // Lookup department first
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "dept"
                }
            },

            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },

            { $match: { "dept._id": { $exists: true } } },

            // Group by department
            {
                $group: {
                    _id: {
                        departmentId: "$department",
                        departmentName: "$dept.name"
                    },
                    documentCount: { $sum: 1 }
                }
            },

            // Calculate total
            {
                $group: {
                    _id: null,
                    totalDocuments: { $sum: "$documentCount" },
                    departments: {
                        $push: {
                            departmentId: "$_id.departmentId",
                            departmentName: "$_id.departmentName",
                            documentCount: "$documentCount"
                        }
                    }
                }
            },

            { $unwind: "$departments" },

            // Calculate percentage and format
            {
                $project: {
                    _id: 0,
                    departmentId: "$departments.departmentId",
                    departmentName: "$departments.departmentName",
                    documentCount: "$departments.documentCount",
                    percentage: {
                        $cond: [
                            { $gt: ["$totalDocuments", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$departments.documentCount", "$totalDocuments"] }, 100] }, 2] },
                            0
                        ]
                    }
                }
            },

            { $sort: { documentCount: -1 } },

            // Limit to top 10 departments for better visualization
            { $limit: 10 }
        ];

        const result = await Document.aggregate(pipeline);

        const chartData = {
            labels: result.map(item => item.departmentName),
            datasets: [{
                data: result.map(item => item.percentage),
                counts: result.map(item => item.documentCount),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
                    '#6A4C93', '#F15BB5'
                ].slice(0, result.length)
            }],
            total: result.reduce((sum, item) => sum + item.documentCount, 0)
        };

        return successResponse(res, {
            period,
            startDate,
            departmentUploads: result,
            chartData: chartData
        }, "Department document uploads fetched successfully");

    } catch (err) {
        console.error("Error in getDepartmentDocumentUploads:", err);
        return errorResponse(res, err);
    }
};

// ------------------- Documents Summary -------------------
export const getDocumentsStatusSummary = async (req, res) => {
    try {
        const { period = "monthly", department, docType } = req.query;

        if (!validPeriods.includes(period)) {
            return failResponse(res, "Invalid period. Must be daily, weekly, monthly, or yearly", 400);
        }

        const startDate = calculateStartDate(period);

        const match = {
            createdAt: { $gte: startDate },
            isDeleted: false
        };

        if (department) match.department = mongoose.Types.ObjectId(department);
        if (docType) match.docType = docType;

        // Determine grouping key based on period
        let dateGroup = {};
        if (period === "monthly") {
            dateGroup = { $month: "$createdAt" };
        } else if (period === "weekly") {
            dateGroup = { $week: "$createdAt" };
        } else if (period === "daily") {
            dateGroup = { $dayOfMonth: "$createdAt" };
        } else if (period === "yearly") {
            dateGroup = { $year: "$createdAt" };
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { month: dateGroup, status: "$status" },
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await Document.aggregate(pipeline);

        // Initialize month categories and empty status counts
        const categories = Array.from({ length: 12 }, (_, i) => i + 1);
        const series = [
            { name: "Pending", data: Array(12).fill(0) },
            { name: "Approved", data: Array(12).fill(0) },
            { name: "Rejected", data: Array(12).fill(0) }
        ];

        results.forEach(item => {
            const monthIndex = item._id.month - 1; // 0-based
            const status = item._id.status;
            const seriesItem = series.find(s => s.name === status);
            if (seriesItem) seriesItem.data[monthIndex] = item.count;
        });

        return successResponse(res, { categories, series }, "Document status summary fetched");

    } catch (err) {
        return errorResponse(res, err);
    }
};
