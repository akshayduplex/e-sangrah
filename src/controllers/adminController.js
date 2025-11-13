import mongoose from "mongoose";
import Document from "../models/Document.js";
import logger from "../utils/logger.js";
import Designation from "../models/Designation.js";
import Folder from "../models/Folder.js";
import PermissionLogs from "../models/PermissionLogs.js";
import User from "../models/User.js";
import SharedWith from "../models/SharedWith.js";
import { sendEmail } from "../services/emailService.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";
import { generateEmailTemplate } from "../helper/emailTemplate.js";

//Page controllers

// Render Dashboard page
export const showAdminDashboardPage = (req, res) => {
    try {
        res.render("pages/admin/adminDashboard", {
            title: " Admin Dashboard",
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
export const showAdminApprovalPage = (req, res) => {
    try {
        res.render("pages/admin/approval", {
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

export const showApprovalTrackPage = async (req, res) => {
    try {
        const documentId = req.params.id;

        res.render('pages/admin/approval-tracking', {
            documentId: documentId,
            user: req.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/admin/approval-tracking', {
            document: null,
            approvals: [],
            user: req.user
        });
    }
};

export const showRecycleBinPage = async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/admin/adminRecycleBin", {
            user: req.user,
            designations
        });
    } catch (err) {
        logger.error("Admin render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};

export const showManageAccessPage = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { userEmail } = req.query;
        const owner = req.user;
        if (!folderId || !owner) {
            return res.status(400).send("Invalid request");
        }

        const folder = await Folder.findById(folderId)
            .populate("owner", "name email")
            .populate("permissions.principal", "name email");

        if (!folder) return res.status(404).send("Folder not found");

        // Only owner can manage access
        if (folder.owner._id.toString() !== owner._id.toString()) {
            return res.status(403).send("Not authorized");
        }

        res.render("pages/admin/manage-access", {
            folder,
            user: req.user,
            userEmail
        });

    } catch (err) {
        logger.error("Admin render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load manage access page"
        });
    }
};
export const showPermissionLogsPage = async (req, res) => {
    try {
        res.render("pages/reports/permissionLogs", {
            title: "Permission Logs",
            user: req.user
        });

    } catch (err) {
        logger.error("render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load manage access page"
        });
    }
};

export const showFolderPermissionLogsPage = async (req, res) => {
    try {
        res.render("pages/reports/folderPermissionLogs", {
            title: "Permission Logs",
            user: req.user
        });

    } catch (err) {
        logger.error("Admin render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load manage access page"
        });
    }
};
//API Controllers

/**
 * Get documents submitted by current user (My Approvals)
 * GET /api/documents/my-approvals
 */
export const getMyApprovals = async (req, res) => {
    try {
        const user = req.user || req.session.user;
        const userId = new mongoose.Types.ObjectId(user._id);
        const profileType = user.profile_type;
        const userDepartment = user.department ? new mongoose.Types.ObjectId(user.department) : null;

        const {
            status,
            department,
            createdAt,
            page = 1,
            limit = 10,
            sortField = "createdAt",
            sortOrder = "desc"
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // ---------------------------------------------
        // STEP 1: Build document filter
        // ---------------------------------------------
        const filter = {
            isDeleted: { $ne: true },
            isArchived: { $ne: true },
            "documentApprovalAuthority": {
                $elemMatch: {
                    userId,
                    isMailSent: true
                }
            }
        };

        if (profileType !== "superadmin") {
            const accessConditions = [
                { owner: userId },
                { "documentApprovalAuthority.userId": userId }
            ];
            if (userDepartment) accessConditions.push({ department: userDepartment });
            filter.$or = accessConditions;
        }

        if (status && status !== "All") {
            filter.status = status;
        }

        if (department && mongoose.Types.ObjectId.isValid(department)) {
            filter.department = new mongoose.Types.ObjectId(department);
        }

        if (createdAt) {
            const [day, month, year] = createdAt.split("-").map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        // ---------------------------------------------
        // STEP 2: Sorting setup
        // ---------------------------------------------
        const allowedFields = [
            "metadata.fileName",
            "createdAt",
            "documentDonor.name",
            "department.name",
            "status",
            "comment"
        ];
        const sortFieldValidated = allowedFields.includes(sortField) ? sortField : "createdAt";
        const sortOrderValidated = sortOrder === "asc" ? 1 : -1;
        const sortObj = { [sortFieldValidated]: sortOrderValidated };

        // ---------------------------------------------
        // STEP 3: Query documents
        // ---------------------------------------------
        const [documents, total] = await Promise.all([
            Document.find(filter)
                .populate("department", "name")
                .populate("documentDonor", "name")
                .populate("files")
                .populate({
                    path: "documentApprovalAuthority.userId",
                    select: "name email profile_type"
                })
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Document.countDocuments(filter)
        ]);

        // ---------------------------------------------
        // STEP 4: Filter only approvals for this user where isMailSent = true
        // ---------------------------------------------
        const filteredDocuments = documents.map(doc => ({
            ...doc,
            documentApprovalAuthority: doc.documentApprovalAuthority?.filter(
                auth =>
                    auth.userId?._id?.toString() === userId.toString() &&
                    auth.isMailSent === true
            ) || []
        }));

        res.status(200).json({
            success: true,
            data: filteredDocuments,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum
            }
        });
    } catch (error) {
        console.error("Error in getMyApprovals:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



export const getPermissionLogs = async (req, res) => {
    const ownerId = req.user._id;
    const profileType = req.session.user.profile_type;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    try {
        // Base query
        const query = {};
        // Restrict by owner unless superadmin
        if (profileType !== 'superadmin') {
            query.owner = ownerId;
        }

        // Optional date filter
        if (startDate || endDate) {
            query.requestedAt = {};
            if (startDate) query.requestedAt.$gte = new Date(startDate);
            if (endDate) query.requestedAt.$lte = new Date(endDate);
        }

        const total = await PermissionLogs.countDocuments(query);

        const logs = await PermissionLogs.find(query)
            .select("user document requestedAt isExternal requestStatus access expiresAt duration")
            .populate({
                path: "document",
                select: "files",
                populate: {
                    path: "files",
                    select: "originalName version fileType fileSize"
                }
            })
            .populate("user", "username email")
            .sort({ requestedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch permission logs' });
    }
};


export const updateRequestStatus = async (req, res) => {
    const { logId, requestStatus } = req.body;;
    if (!["approved", "pending", "rejected"].includes(requestStatus)) {
        return res.status(400).json({ success: false, message: "Invalid request status" });
    }

    try {
        const log = await PermissionLogs.findByIdAndUpdate(
            logId,
            { requestStatus, approvedBy: req.user._id },
            { new: true }
        );
        if (!log) return res.status(404).json({ success: false, message: "Permission log not found" });

        res.status(200).json({ success: true, data: log });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to update request status" });
    }
};

export const grantAccess = async (req, res) => {
    try {
        const { logId, duration, customDates } = req.body;

        if (!logId || !duration) {
            return res.status(400).json({ message: "logId & duration are required." });
        }

        const log = await PermissionLogs.findById(logId).populate("document owner");
        if (!log) return res.status(404).json({ message: "Permission log not found" });

        const doc = log.document;
        if (!doc) return res.status(404).json({ message: "Document not found in log" });

        const loggedUser = log.user; // embedded data
        const userEmail = loggedUser?.email;

        // Determine internal or external user
        const internalUser = await User.findOne({ email: userEmail });
        const isExternal = !internalUser;

        // Duration Handling
        const now = new Date();
        let expiresAt = null;

        const durationMap = {
            oneday: () => new Date(now.getTime() + 24 * 60 * 60 * 1000),
            oneweek: () => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            onemonth: () => new Date(now.setMonth(now.getMonth() + 1)),
            lifetime: () => new Date(now.setFullYear(now.getFullYear() + 50)),
            onetime: () => null
        };

        if (duration === "custom" && customDates) {
            const [, end] = customDates.split(" to ");
            expiresAt = new Date(end);
        } else {
            expiresAt = durationMap[duration]?.() ?? null;
        }

        // Construct Access URL (use current document version)
        const currentVersion = doc.versioning?.currentVersion?.toString() || "1.0";
        const accessUrl = `${API_CONFIG.baseUrl}/documents/${doc._id}/versions/view?version=${currentVersion}`;

        // If Internal User → Update SharedWith
        if (!isExternal && internalUser) {
            await SharedWith.findOneAndUpdate(
                { document: doc._id, user: internalUser._id },
                {
                    accessLevel: "view",
                    duration,
                    expiresAt,
                    generalAccess: true
                },
                { new: true, upsert: true }
            );
        }

        // Update Permission Log
        log.requestStatus = "approved";
        log.approvedBy = doc.owner;
        log.isExternal = isExternal;
        log.duration = duration;
        log.expiresAt = expiresAt;
        log.accessUrl = accessUrl; // optional: store URL in log for reference
        await log.save();

        // Email Notification
        if (!isExternal && userEmail) {
            // Prepare dynamic data for the template
            const data = {
                userName: internalUser?.name || userEmail,
                fileName: doc.metadata?.fileName || "Untitled Document",
                duration,
                expiresAt: expiresAt ? expiresAt.toLocaleString() : "N/A",
                ownerName: doc.owner?.name || "Document Owner",
                accessUrl
            };

            // Generate HTML using your central email generator
            const html = generateEmailTemplate('accessGranted', data);

            // Send the email
            await sendEmail({
                to: userEmail,
                subject: "Access Granted",
                html,
                fromName: "Support Team",
            });
        }
        return res.status(200).json({
            message: `Access granted to ${loggedUser?.username || userEmail}`,
            expiresAt,
            isExternal,
            accessUrl
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};