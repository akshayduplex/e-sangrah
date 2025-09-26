const mongoose = require("mongoose");
const Document = require("../models/Document");
const { successResponse, failResponse, errorResponse } = require("../utils/responseHandler");
const { calculateStartDate } = require("../utils/calculateStartDate");

const validPeriods = ["daily", "weekly", "monthly", "yearly"];

// ------------------- Dashboard Stats -------------------
exports.getDashboardStats = async (req, res) => {
    try {
        const user = req.user || req.session.user;
        const userId = user._id;

        // Document statistics
        const documentStats = await Document.aggregate([
            {
                $match: {
                    $or: [
                        { owner: new mongoose.Types.ObjectId(userId) },
                        { "sharedWith.user": new mongoose.Types.ObjectId(userId) },
                        { "sharedWithDepartments.department": user.department }
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

        return successResponse(res, stats, "Dashboard stats fetched successfully");
    } catch (err) {
        return errorResponse(res, err);
    }
};

// ------------------- Document Type Uploads -------------------
exports.getDocumentTypeUploads = async (req, res) => {
    try {
        const user = req.user || req.session.user;
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
exports.getDocumentsSummary = async (req, res) => {
    try {
        const user = req.user || req.session.user;
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
                    localField: "files.file",
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