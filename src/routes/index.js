import express from "express";
import authRoutes from './auth/authRoutes.js';
import dashboardRoutes from './admin/AdminDashboardRoutes.js';
import documentRoutes from './documents/documentRoutes.js';
import departmentRoutes from './department/departmentRoutes.js';
import projectRoutes from './projects/projectRoutes.js';
import notificationRoutes from './notification/notificationRoutes.js';
import permisssionRoutes from "./permisssions/permissionsRoutes.js"
import userRoutes from "./userRoutes/userRoute.js"
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/departments', departmentRoutes);
router.use('/projects', projectRoutes);
router.use('/notifications', notificationRoutes);
router.use("/", permisssionRoutes);
router.use("/user", userRoutes);

export default router;
