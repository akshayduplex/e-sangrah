import Notification from "../models/notification.js";
import logger from "../utils/logger.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";

//Page Controllers

// Render Notifications page
export const showNotificationsPage = (req, res) => {
    try {
        res.render("pages/notifications", {
            title: "E-Sangrah - Notifications",
            user: req.user
        });
    } catch (err) {
        console.error("Error loading notifications page:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load notifications",
            user: req.user
        });
    }
};

//API Controllers

// ------------------- Create Notification -------------------
export const createNotification = async (req, res) => {
    try {
        const data = {
            recipient: req.body.recipient,
            sender: req.user?._id || null,
            type: req.body.type,
            title: req.body.title,
            message: req.body.message,
            relatedDocument: req.body.relatedDocument || null,
            relatedProject: req.body.relatedProject || null,
            priority: req.body.priority || "medium",
            actionUrl: req.body.actionUrl || null
        };

        const notification = await Notification.create(data);
        return successResponse(res, notification, "Notification created successfully", 201);
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Get User Notifications -------------------
export const getUserNotifications = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const filter = { recipient: req.user._id };
        if (req.query.unread === "true") filter.isRead = false;

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .populate("sender", "_id email name")
                .populate("relatedDocument", "_id title")
                .populate("relatedProject", "_id name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        const formattedNotifications = notifications.map(n => ({
            _id: n._id,
            recipient: n.recipient,
            sender: n.sender ? {
                _id: n.sender._id,
                email: n.sender.email,
                name: n.sender.name || `${n.sender.firstName || ''} ${n.sender.lastName || ''}`.trim() || undefined
            } : null,
            type: n.type,
            title: n.title,
            message: n.message,
            relatedDocument: n.relatedDocument ? { _id: n.relatedDocument._id, title: n.relatedDocument.title } : null,
            relatedProject: n.relatedProject ? { _id: n.relatedProject._id, name: n.relatedProject.name } : null,
            isRead: n.isRead,
            priority: n.priority,
            actionUrl: n.actionUrl,
            expiresAt: n.expiresAt,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt
        }));

        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            data: {
                notifications: formattedNotifications,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        logger.error("Error fetching notifications:", error);
        return errorResponse(res, error, "Failed to fetch notifications");
    }
};

// ------------------- Get Unread Count -------------------
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
        return successResponse(res, { count }, "Unread notifications count fetched");
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Mark Single Notification as Read -------------------
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) return failResponse(res, "Notification not found or unauthorized", 404);

        return successResponse(res, notification, "Notification marked as read");
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Mark All Notifications as Read -------------------
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        return successResponse(res, null, "All notifications marked as read");
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Delete Notification -------------------
export const deleteNotification = async (req, res) => {
    try {
        const result = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
        if (!result) return failResponse(res, "Notification not found or unauthorized", 404);

        return successResponse(res, null, "Notification deleted successfully");
    } catch (error) {
        return errorResponse(res, error);
    }
};
