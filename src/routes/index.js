import express from "express";
import authRoutes from './auth/authRoutes.js';
import documentRoutes from './documents/documentRoutes.js';
import departmentRoutes from './department/departmentRoutes.js';
import projectRoutes from './projects/projectRoutes.js';
import notificationRoutes from './notification/notificationRoutes.js';
import permisssionRoutes from "./permisssions/permissionsRoutes.js"
import userRoutes from "./userRoutes/userRoute.js"
import vendorDonor from './userRoutes/vendorDonor.js'
import tempRoutes from "./tempFileRoutes.js"
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/departments', departmentRoutes);
router.use('/projects', projectRoutes);
router.use('/notifications', notificationRoutes);
router.use("/", permisssionRoutes);
router.use("/user", userRoutes);
router.use("/files", tempRoutes)
router.use(vendorDonor);

export default router;
