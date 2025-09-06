const Notification = require("../../models/notification");
const { successResponse, failResponse, errorResponse } = require("../../utils/responseHandler");

// ------------------- Create Notification -------------------
exports.createNotification = async (req, res) => {
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
exports.getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("sender", "name email")
            .populate("relatedDocument", "title")
            .populate("relatedProject", "name")
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await Notification.countDocuments({ recipient: req.user._id });

        return successResponse(res, { notifications, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Get Unread Count -------------------
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
        return successResponse(res, { count }, "Unread notifications count fetched");
    } catch (error) {
        return errorResponse(res, error);
    }
};

// ------------------- Mark Single Notification as Read -------------------
exports.markAsRead = async (req, res) => {
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
exports.markAllAsRead = async (req, res) => {
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
exports.deleteNotification = async (req, res) => {
    try {
        const result = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
        if (!result) return failResponse(res, "Notification not found or unauthorized", 404);

        return successResponse(res, null, "Notification deleted successfully");
    } catch (error) {
        return errorResponse(res, error);
    }
};
