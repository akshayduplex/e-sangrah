import express from "express";
import * as notificationController from "../../controllers/notification/notificationController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// CRUD endpoints
router.post("/", notificationController.createNotification);
router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.post("/notify", (req, res) => {
    const io = req.app.get("io"); // get Socket.IO instance
    const { message } = req.body;

    io.emit("notification", {
        message,
        timestamp: new Date(),
    });

    res.json({ success: true, message: "Notification sent" });
});

// Export router as default
export default router;
