const mongoose = require("mongoose");
const Document = require("../../models/Document");

const validPeriods = ["daily", "weekly", "monthly", "yearly"];

// Utility: calculate start date for period filters
function calculateStartDate(period) {
    let startDate = new Date();
    switch (period) {
        case "daily": startDate.setDate(startDate.getDate() - 1); break;
        case "weekly": startDate.setDate(startDate.getDate() - 7); break;
        case "monthly": startDate.setMonth(startDate.getMonth() - 1); break;
        case "yearly": startDate.setFullYear(startDate.getFullYear() - 1); break;
    }
    return startDate;
}

// ================= Dashboard APIs =================

// GET /api/dashboard/stats
exports.getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Aggregate document stats
        const documentStats = await Document.aggregate([
            {
                $match: {
                    $or: [
                        { owner: new mongoose.Types.ObjectId(userId) },
                        { "sharedWith.user": new mongoose.Types.ObjectId(userId) },
                        { "sharedWithDepartments.department": req.user.department }
                    ]
                }
            },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
        documentStats.forEach(stat => {
            const key = stat._id?.toLowerCase();
            if (stats.hasOwnProperty(key)) stats[key] = stat.count;
            stats.total += stat.count;
        });

        // Latest 10 files
        const fileStatus = await Document.aggregate([
            {
                $match: {
                    $or: [
                        { owner: new mongoose.Types.ObjectId(userId) },
                        { "sharedWith.user": new mongoose.Types.ObjectId(userId) },
                        { "sharedWithDepartments.department": req.user.department }
                    ]
                }
            },
            { $unwind: "$files" },
            {
                $lookup: {
                    from: "files",
                    localField: "files.file",
                    foreignField: "_id",
                    as: "fileDetails"
                }
            },
            { $unwind: "$fileDetails" },
            {
                $project: {
                    filename: "$fileDetails.originalName",
                    size: "$fileDetails.size",
                    type: "$fileDetails.extension",
                    status: "$status",
                    uploadedAt: "$fileDetails.uploadDate"
                }
            },
            { $sort: { uploadedAt: -1 } },
            { $limit: 10 }
        ]);

        // Recent activity (latest 6 audit logs)
        const recentActivity = await Document.aggregate([
            {
                $match: {
                    $or: [
                        { owner: new mongoose.Types.ObjectId(userId) },
                        { "sharedWith.user": new mongoose.Types.ObjectId(userId) },
                        { "sharedWithDepartments.department": req.user.department }
                    ]
                }
            },
            { $unwind: "$auditLog" },
            { $sort: { "auditLog.timestamp": -1 } },
            { $limit: 6 },
            {
                $lookup: {
                    from: "users",
                    localField: "auditLog.performedBy",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    action: "$auditLog.action",
                    timestamp: "$auditLog.timestamp",
                    performedBy: { $ifNull: ["$userDetails.name", "Someone"] },
                    documentTitle: "$title"
                }
            }
        ]);

        return res.json({ success: true, data: { stats, fileStatus, recentActivity } });
    } catch (error) {
        next(error);
    }
};

// GET /api/dashboard/file-types
exports.getDocumentTypeUploads = async (req, res, next) => {
    try {
        const period = req.query.period || "monthly";
        if (!validPeriods.includes(period)) return res.status(400).json({ success: false, message: "Invalid period" });

        const startDate = calculateStartDate(period);

        const result = await Document.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: "$files" },
            {
                $lookup: {
                    from: "files",
                    localField: "files.file",
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
                    percentage: { $cond: [{ $eq: ["$total", 0] }, 0, { $round: [{ $multiply: [{ $divide: ["$types.count", "$total"] }, 100] }, 2] }] }
                }
            },
            { $sort: { percentage: -1 } }
        ]);

        return res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

// GET /api/dashboard/summary
exports.getDocumentsSummary = async (req, res, next) => {
    try {
        const period = req.query.period || "monthly";
        const fileType = req.query.fileType || null;

        if (!validPeriods.includes(period)) return res.status(400).json({ success: false, message: "Invalid period" });

        const startDate = calculateStartDate(period);

        const pipeline = [
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: "$files" },
            { $lookup: { from: "files", localField: "files.file", foreignField: "_id", as: "fileInfo" } },
            { $unwind: "$fileInfo" }
        ];

        if (fileType) pipeline.push({ $match: { "fileInfo.extension": fileType.toLowerCase() } });
        pipeline.push({ $group: { _id: "$status", count: { $sum: 1 } } });

        const docsByStatus = await Document.aggregate(pipeline);

        const summary = {
            totalDocs: docsByStatus.reduce((sum, d) => sum + d.count, 0),
            pendingDocs: docsByStatus.find(d => d._id === "Pending")?.count || 0,
            approvedDocs: docsByStatus.find(d => d._id === "Approved")?.count || 0,
            rejectedDocs: docsByStatus.find(d => d._id === "Rejected")?.count || 0
        };

        return res.json({ success: true, data: { period, fileType: fileType || "all", ...summary, startDate, endDate: new Date() } });
    } catch (error) {
        next(error);
    }
};

// ================= Dashboard Page Render =================
exports.renderDashboardPage = async (req, res, next) => {
    try {
        const user = req.session.user;

        const [statsRes, filesRes, summaryRes] = await Promise.all([
            exports.getDashboardStats({ user, json: false }),
            exports.getDocumentTypeUploads({ user, json: false }),
            exports.getDocumentsSummary({ user, json: false })
        ]);

        res.render("pages/dashboard", {
            user,
            stats: statsRes?.data || {},
            docs: filesRes?.data || [],
            summary: summaryRes?.data || {}
        });
    } catch (error) {
        next(error);
    }
};
