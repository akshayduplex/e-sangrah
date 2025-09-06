const express = require("express");
const router = express.Router();
const authRoutes = require('./auth/authRoutes');
const dashboardRoutes = require('./admin/AdminDashboardRoutes');
const documentRoutes = require('./documents/documentRoutes');
const departmentRoutes = require('./department/departmentRoutes');
const projectRoutes = require('./projects/projectRoutes');
const notificationRoutes = require('./notification/notificationRoutes');
const permisssionRoutes = require("../routes/permisssions/index")


router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/departments', departmentRoutes);
router.use('/projects', projectRoutes);
router.use('/notifications', notificationRoutes);
router.use("/", permisssionRoutes)

module.exports = router;
