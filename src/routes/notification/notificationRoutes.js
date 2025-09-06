const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notification/notificationController");
const { authenticate } = require("../../middlewares/authMiddleware"); // assume you have JWT/session auth

// All routes require authentication
router.use(authenticate);

// CRUD endpoints
router.post("/", notificationController.createNotification);
router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
