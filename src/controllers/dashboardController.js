import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";
import File from "../models/File.js";
import { getFileIcon } from "../helper/getFileIcon.js";
import { FILTER_PERIODS } from "../constant/Constant.js";
import Project, { ProjectType } from "../models/Project.js";
import { getSessionFilters } from "../helper/sessionHelpers.js";

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
        const { selectedProjectId, selectedYear } = getSessionFilters(req);
        // Base filters
        const matchConditions = [
            { isDeleted: { $ne: true } },
            { isArchived: { $ne: true } },
        ];

        // Filter by selected project if available
        if (selectedProjectId) {
            matchConditions.push({ project: selectedProjectId });
        }

        // Filter by selected year if available
        if (selectedYear) {
            const startOfYear = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
            const endOfYear = new Date(`${Number(selectedYear) + 1}-01-01T00:00:00.000Z`);
            matchConditions.push({ createdAt: { $gte: startOfYear, $lt: endOfYear } });
        }

        // Apply access restrictions for non-superadmin users
        if (profileType !== "superadmin") {
            const accessConditions = [
                { owner: userId },
                { sharedWithUsers: userId },
            ];

            if (userDepartment) {
                accessConditions.push({ department: userDepartment });
            }

            matchConditions.push({ $or: accessConditions });
        }

        // Aggregate stats
        const documentStats = await Document.aggregate([
            { $match: { $and: matchConditions } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format stats
        const stats = { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 };

        documentStats.forEach(stat => {
            const key = stat._id?.toLowerCase();
            if (stats.hasOwnProperty(key)) {
                stats[key] = stat.count;
            }
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


/**
 * Get Donor & Vendor Project Summary
 * @route GET /api/dashboard/donor-vendor-projects
 * @query donorId, vendorId, period (today|week|month|year)
 */
export const getDonorVendorProjects = async (req, res) => {
    try {
        const { donorId, vendorId, period } = req.query;

        // ---------- DATE FILTER ----------
        const dateFilter = {};
        const now = new Date();

        if (period === "today") {
            dateFilter.projectStartDate = {
                $gte: new Date(now.setHours(0, 0, 0, 0)),
                $lte: new Date(now.setHours(23, 59, 59, 999)),
            };
        } else if (period === "week") {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            dateFilter.projectStartDate = { $gte: startOfWeek };
        } else if (period === "month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter.projectStartDate = { $gte: startOfMonth };
        }

        // ---------- BASE QUERY ----------
        const baseQuery = { isActive: true, ...dateFilter };
        if (donorId) baseQuery.donor = donorId;
        if (vendorId) baseQuery.vendor = vendorId;

        // ---------- FETCH ALL PROJECT TYPES ----------
        const projectTypes = await ProjectType.find({ isActive: true }).select("name");

        // ---------- AGGREGATE PROJECT COUNTS ----------
        const results = await Promise.all(
            projectTypes.map(async (type) => {
                // find all projects of this type
                const projects = await Project.find({
                    ...baseQuery,
                    projectType: type._id,
                }).select("donor vendor");

                // count unique donors & vendors across projects
                const donorsSet = new Set();
                const vendorsSet = new Set();

                projects.forEach((p) => {
                    p.donor?.forEach((d) => donorsSet.add(d.toString()));
                    p.vendor?.forEach((v) => vendorsSet.add(v.toString()));
                });

                return {
                    projectType: type.name,
                    totalProjects: projects.length,
                    donorCount: donorsSet.size,
                    vendorCount: vendorsSet.size,
                };
            })
        );

        res.json({ success: true, data: results });
    } catch (error) {
        console.error("Error fetching donor/vendor data:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const getDepartmentDocumentUploads = async (req, res) => {
    try {
        const { period = "month", projectId } = req.query;
        const user = req.user;
        const userId = user?._id;

        // Validate period
        if (!FILTER_PERIODS.includes(period)) {
            return failResponse(res, "Invalid period. Must be today, week, month, or year", 400);
        }

        const startDate = calculateStartDate(period);

        // Base match filter
        const matchStage = {
            createdAt: { $gte: startDate },
            isDeleted: false,
            department: { $exists: true, $ne: null },
        };

        // Restrict visibility: only owner for non-superadmins
        if (user.profile_type !== "superadmin") {
            matchStage.owner = new mongoose.Types.ObjectId(userId);
        }

        // 🔹 Project filter (if provided)
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            matchStage.project = new mongoose.Types.ObjectId(projectId);
        }

        const pipeline = [
            { $match: matchStage },

            // Lookup department name
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

            // Compute total and percentage
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
            { $limit: 10 }
        ];

        const result = await Document.aggregate(pipeline);

        return successResponse(
            res,
            {
                period,
                startDate,
                projectId: projectId || null,
                departmentUploads: result,
            },
            "Department document uploads fetched successfully"
        );
    } catch (err) {
        console.error("Error in getDepartmentDocumentUploads:", err);
        return errorResponse(res, err);
    }
};


export const getDocumentsTypeUploads = async (req, res) => {
    try {
        const { period = "month", projectId, departmentId, uploadedBy } = req.query;
        const user = req.user; // assuming auth middleware sets req.user
        const userId = user?._id;

        // Validate period
        if (!FILTER_PERIODS.includes(period)) {
            return failResponse(res, "Invalid period. Must be today, week, month, or year", 400);
        }

        const startDate = calculateStartDate(period);

        // Base filter
        const matchStage = {
            uploadedAt: { $gte: startDate },
            status: "active",
        };

        // 🔒 Restrict visibility: only own uploads for non-superadmins
        if (user.profile_type !== "superadmin") {
            matchStage.uploadedBy = new mongoose.Types.ObjectId(userId);
        }

        // Optional filters
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            matchStage.projectId = new mongoose.Types.ObjectId(projectId);
        }
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
        }
        // Allow filtering by uploadedBy ONLY if superadmin (so users can’t view others)
        if (
            uploadedBy &&
            mongoose.Types.ObjectId.isValid(uploadedBy) &&
            user.profile_type === "superadmin"
        ) {
            matchStage.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
        }

        const pipeline = [
            { $match: matchStage },

            // Combine fileType + originalName for detection
            { $addFields: { checkString: { $concat: ["$fileType", " ", "$originalName"] } } },

            // Categorize file type
            {
                $addFields: {
                    category: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: "$checkString", regex: /pdf/i } }, then: "PDF" },
                                { case: { $regexMatch: { input: "$checkString", regex: /xls|xlsx|excel/i } }, then: "Excel" },
                                { case: { $regexMatch: { input: "$checkString", regex: /doc|docx|word/i } }, then: "Word" },
                                { case: { $regexMatch: { input: "$checkString", regex: /jpg|jpeg|png|image/i } }, then: "Image" },
                                { case: { $regexMatch: { input: "$checkString", regex: /ppt|powerpoint/i } }, then: "PowerPoint" },
                                { case: { $regexMatch: { input: "$checkString", regex: /csv|txt|text/i } }, then: "Text/CSV" }
                            ],
                            default: "Other"
                        }
                    }
                }
            },

            // Group by file category
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalSize: { $sum: "$fileSize" }
                }
            },

            // Compute totals and percentages
            {
                $group: {
                    _id: null,
                    totalFiles: { $sum: "$count" },
                    totalSize: { $sum: "$totalSize" },
                    types: {
                        $push: {
                            type: "$_id",
                            count: "$count",
                            totalSize: "$totalSize"
                        }
                    }
                }
            },

            { $unwind: "$types" },

            {
                $addFields: {
                    "types.percentage": {
                        $cond: [
                            { $gt: ["$totalFiles", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$types.count", "$totalFiles"] },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0
                        ]
                    },
                    "types.sizePercentage": {
                        $cond: [
                            { $gt: ["$totalSize", 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: ["$types.totalSize", "$totalSize"] },
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

            {
                $project: {
                    _id: 0,
                    totalFiles: 1,
                    type: "$types.type",
                    count: "$types.count",
                    percentage: "$types.percentage",
                    totalSizeMB: { $round: [{ $divide: ["$types.totalSize", 1048576] }, 2] },
                    sizePercentage: "$types.sizePercentage"
                }
            },

            { $sort: { count: -1 } }
        ];

        const result = await File.aggregate(pipeline);

        return successResponse(
            res,
            {
                period,
                startDate,
                projectId: projectId || null,
                departmentId: departmentId || null,
                uploadedBy: uploadedBy || null,
                fileTypeBreakdown: result,
            },
            "Project file type uploads fetched successfully"
        );

    } catch (err) {
        console.error("Error in getDocumentsTypeUploads:", err);
        return errorResponse(res, err);
    }
};

// ------------------- Documents Summary -------------------
export const getDocumentsStatusSummary = async (req, res) => {
    try {
        const { period = "month", department, docType } = req.query;
        const { selectedProjectId, selectedYear } = getSessionFilters(req);
        const projectId = selectedProjectId;
        const year = Number(selectedYear);

        // Validate period
        if (!FILTER_PERIODS.includes(period)) {
            return failResponse(res, "Invalid period. Must be today, week, month, or year", 400);
        }

        const startDate = calculateStartDate(period);

        // Base match query
        const match = {
            isDeleted: false,
        };

        // 🔹 Project filter
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            match.project = new mongoose.Types.ObjectId(projectId);
        }

        // 🔹 Department filter
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            match.department = new mongoose.Types.ObjectId(department);
        }

        // 🔹 DocType filter
        if (docType) match.docType = docType;

        // 🔹 Year filter (takes precedence)
        if (year && !isNaN(year)) {
            const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
            const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
            match.createdAt = { $gte: yearStart, $lt: yearEnd };
        } else {
            match.createdAt = { $gte: startDate };
        }

        // Define grouping logic based on period
        let dateGroup = null;
        let categories = [];

        switch (period) {
            case "today":
                dateGroup = { $hour: "$createdAt" };
                categories = Array.from({ length: 24 }, (_, i) => `${i}:00`);
                break;
            case "week":
                dateGroup = { $dayOfWeek: "$createdAt" };
                categories = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                break;
            case "month":
                dateGroup = { $dayOfMonth: "$createdAt" };
                const now = new Date();
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
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
                        status: "$status",
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.period": 1 } }
        ];

        const results = await Document.aggregate(pipeline);

        // Build chart data
        const statuses = ["Draft", "Pending", "Approved", "Rejected"];
        const series = statuses.map(status => ({
            name: status,
            data: Array(categories.length).fill(0),
        }));

        results.forEach(item => {
            const idx = (item._id.period || 1) - 1;
            const seriesItem = series.find(s => s.name === item._id.status);
            if (seriesItem && idx >= 0 && idx < seriesItem.data.length) {
                seriesItem.data[idx] += item.count;
            }
        });

        return successResponse(
            res,
            {
                categories,
                series,
                year: year || null,
                projectId: projectId || null,
            },
            "Document status summary fetched successfully"
        );

    } catch (err) {
        console.error("Error in getDocumentsStatusSummary:", err);
        return errorResponse(res, err);
    }
};
