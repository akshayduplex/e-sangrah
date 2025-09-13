import mongoose from "mongoose";
import Document from "../../models/Document.js";
import { calculateStartDate } from "../../utils/calculateStartDate.js";

const validPeriods = ["daily", "weekly", "monthly", "yearly"];

// ================= Dashboard APIs =================

export const getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

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

        return res.json({ success: true, data: { stats } });
    } catch (error) {
        next(error);
    }
};

export const getDocumentTypeUploads = async (req, res, next) => {
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

export const getDocumentsSummary = async (req, res, next) => {
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

export const renderDashboardPage = async (req, res, next) => {
    try {
        const user = req.session.user;

        // You can call API methods directly if needed
        const statsRes = await getDashboardStats(req, { json: () => { } }, next);
        const filesRes = await getDocumentTypeUploads(req, { json: () => { } }, next);
        const summaryRes = await getDocumentsSummary(req, { json: () => { } }, next);

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
