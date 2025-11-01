import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";
import File from "../models/File.js";
import { getFileIcon } from "../helper/getFileIcon.js";
import { FILTER_PERIODS } from "../constant/Constant.js";

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
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const skip = (page - 1) * limit;

        // Build base query
        let query = {};
        if (user.profile_type !== "superadmin") {
            query = { uploadedBy: user._id };
        }

        // Build aggregation pipeline to:
        // 1. Match base query
        // 2. Filter out files where latest activity was by current user
        // 3. Sort, skip, limit
        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "users",
                    localField: "uploadedBy",
                    foreignField: "_id",
                    as: "uploadedBy"
                }
            },
            { $unwind: { path: "$uploadedBy", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    latestActivity: { $arrayElemAt: ["$activityLog", -1] }
                }
            },
            {
                $match: {
                    latestActivity: { $ne: null },
                    "latestActivity.performedBy": { $ne: user._id }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "latestActivity.performedBy",
                    foreignField: "_id",
                    as: "latestActivity.performedBy"
                }
            },
            {
                $unwind: {
                    path: "$latestActivity.performedBy",
                    preserveNullAndEmptyArrays: true
                }
            },
            { $sort: { "latestActivity.timestamp": -1, updatedAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    originalName: 1,
                    fileSize: 1,
                    fileType: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    uploadedBy: {
                        _id: "$uploadedBy._id",
                        name: "$uploadedBy.name",
                        email: "$uploadedBy.email"
                    },
                    latestActivity: 1
                }
            }
        ];

        // Run aggregation
        const files = await File.aggregate(pipeline).option({ allowDiskUse: true });

        // Count total filtered documents
        const countPipeline = pipeline.slice(0, -3); // Remove sort, skip, limit
        countPipeline.push({ $count: "total" });
        const countResult = await File.aggregate(countPipeline);
        const totalCount = countResult[0]?.total || 0;

        // Helper: file size formatting
        const formatFileSize = (bytes) => {
            if (!bytes) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        };

        // Status mapping
        const statusTextMap = {
            opened: "Opened the file",
            modified: "Modified the file",
            downloaded: "Downloaded the file",
            shared: "Shared the file",
            closed: "Closed the file",
            uploaded: "Uploaded the file",
        };

        // Map final response
        const formattedFiles = files.map(file => {
            const activity = file.latestActivity;
            return {
                _id: file._id,
                name: file.originalName,
                fileSize: formatFileSize(file.fileSize),
                status: activity?.action
                    ? statusTextMap[activity.action] || activity.action
                    : "No activity yet",
                icon: getFileIcon(file.fileType),
                lastActionTime: activity?.timestamp || file.createdAt,
                performedBy: activity?.performedBy
                    ? {
                        name: activity.performedBy.name,
                        email: activity.performedBy.email,
                    }
                    : file.uploadedBy
                        ? {
                            name: file.uploadedBy.name,
                            email: file.uploadedBy.email,
                        }
                        : null,
            };
        });

        // Send correct pagination
        res.status(200).json({
            success: true,
            count: formattedFiles.length,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
            currentPage: page,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
            files: formattedFiles,
        });

    } catch (error) {
        console.error("Error fetching file activity list:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch file activity list",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};



/** Get Recent Activities */
export const getRecentActivities = async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const userId = req.user?._id;
        const profile_type = req.user?.profile_type;

        const matchDoc = { isDeleted: false, isArchived: false };
        const matchFile = { status: "active" };

        if (profile_type !== "superadmin") {
            matchDoc.$or = [{ owner: userId }, { sharedWithUsers: userId }];
            matchFile.$or = [
                { uploadedBy: userId },
                { sharedWithUsers: userId }, // optional if sharing tracked on file
            ];
        }

        // --- Fetch document version activities ---
        const docActivities = await Document.aggregate([
            { $match: matchDoc },
            { $unwind: "$versionHistory" },
            { $sort: { "versionHistory.timestamp": -1 } },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "users",
                    localField: "versionHistory.changedBy",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    type: { $literal: "document" },
                    documentId: "$_id",
                    documentName: "$metadata.fileName",
                    activity: "$versionHistory.changes",
                    timestamp: "$versionHistory.timestamp",
                    userName: "$user.name",
                    userId: "$user._id",
                    version: "$versionHistory.version",
                },
            },
        ]);

        // --- Fetch file activity logs ---
        const fileActivities = await File.aggregate([
            { $match: matchFile },
            { $unwind: "$activityLog" },
            { $sort: { "activityLog.timestamp": -1 } },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "users",
                    localField: "activityLog.performedBy",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    type: { $literal: "file" },
                    fileId: "$_id",
                    fileName: "$originalName",
                    activity: "$activityLog.action",
                    details: "$activityLog.details",
                    timestamp: "$activityLog.timestamp",
                    userName: "$user.name",
                    userId: "$user._id",
                },
            },
        ]);

        // --- Merge and sort both types by timestamp ---
        const allActivities = [...docActivities, ...fileActivities].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        res.status(200).json({ recentActivities: allActivities.slice(0, limit) });
    } catch (error) {
        console.error("Error fetching recent activities:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// More efficient version with fewer stages
export const getDepartmentDocumentUploads = async (req, res) => {
    try {
        const { period = "month", projectId } = req.query;
        // Validate period
        if (!FILTER_PERIODS.includes(period)) {
            return failResponse(res, "Invalid period. Must be today, week, month, or year", 400);
        }

        const startDate = calculateStartDate(period);

        // Prepare the initial $match filter
        const matchStage = {
            createdAt: { $gte: startDate },
            isDeleted: false,
            department: { $exists: true, $ne: null }
        };

        // If projectId is provided, filter by it
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            matchStage.project = new mongoose.Types.ObjectId(projectId);
        }

        const pipeline = [
            { $match: matchStage },

            // Lookup department name only
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "dept",
                    pipeline: [{ $project: { name: 1 } }]
                }
            },

            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: false } },

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

            // Compute total across all departments
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

            // Calculate percentage
            {
                $addFields: {
                    percentage: {
                        $cond: [
                            { $gt: ["$totalDocuments", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$departments.documentCount", "$totalDocuments"] },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0
                        ]
                    }
                }
            },

            // Format output
            {
                $project: {
                    _id: 0,
                    departmentId: "$departments.departmentId",
                    departmentName: "$departments.departmentName",
                    documentCount: "$departments.documentCount",
                    percentage: 1
                }
            },

            { $sort: { documentCount: -1 } },

            // Limit to top 10 for visualization
            { $limit: 10 }
        ];

        const result = await Document.aggregate(pipeline);

        return successResponse(res, {
            period,
            startDate,
            projectId: projectId || null,
            departmentUploads: result,
        }, "Department document uploads fetched successfully");

    } catch (err) {
        console.error("Error in getDepartmentDocumentUploads:", err);
        return errorResponse(res, err);
    }
};

// ------------------- Documents Summary -------------------
export const getDocumentsStatusSummary = async (req, res) => {
    try {
        const { period = "month", department, projectId, docType } = req.query;

        //Validate period
        if (!FILTER_PERIODS.includes(period)) {
            return failResponse(res, "Invalid period. Must be today, week, month, or year", 400);
        }

        const startDate = calculateStartDate(period);

        // Base match query
        const match = {
            createdAt: { $gte: startDate },
            isDeleted: false,
        };

        if (department) match.department = new mongoose.Types.ObjectId(department);
        if (projectId) match.project = new mongoose.Types.ObjectId(projectId);
        if (docType) match.docType = docType;

        //Group by date and department for aggregation
        let dateGroup = null;
        let categories = [];
        let periodFormat = "";

        // Configure grouping granularity
        switch (period) {
            case "today":
                dateGroup = { $hour: "$createdAt" }; // hourly trend
                categories = Array.from({ length: 24 }, (_, i) => `${i}:00`);
                break;
            case "week":
                dateGroup = { $dayOfWeek: "$createdAt" }; // Sunday=1 ... Saturday=7
                categories = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                break;
            case "month":
                dateGroup = { $dayOfMonth: "$createdAt" };
                // get number of days in this month
                const daysInMonth = new Date().getDate();
                categories = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
                break;
            case "year":
                dateGroup = { $month: "$createdAt" };
                categories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                break;
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: {
                        period: dateGroup,
                        department: "$department",
                        status: "$status",
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id.department",
                    foreignField: "_id",
                    as: "departmentData",
                },
            },
            {
                $unwind: {
                    path: "$departmentData",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 0,
                    period: "$_id.period",
                    department: "$departmentData.name",
                    status: "$_id.status",
                    count: 1,
                },
            },
            { $sort: { period: 1 } },
        ];

        const results = await Document.aggregate(pipeline);
        // Build series by status for charts
        const statuses = ["Draft", "Pending", "Approved", "Rejected"];
        const series = statuses.map(status => ({
            name: status,
            data: Array(categories.length).fill(0),
        }));

        results.forEach(item => {
            const idx = item.period - 1; // adjust for zero-based arrays
            const seriesItem = series.find(s => s.name === item.status);
            if (seriesItem && idx >= 0 && idx < seriesItem.data.length) {
                seriesItem.data[idx] += item.count;
            }
        });

        return successResponse(
            res,
            {
                categories,
                series,
                // results,
            },
            "Department document uploads summary fetched successfully"
        );

    } catch (err) {
        console.error("Error fetching department document uploads:", err);
        return errorResponse(res, err);
    }
};
