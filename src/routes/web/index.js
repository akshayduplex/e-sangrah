import express from "express";

// Import sub-routers
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import donorRoutes from "./donor.routes.js";
import vendorRoutes from "./vendor.routes.js";
import departmentRoutes from "./department.routes.js";
import designationRoutes from "./designation.routes.js";
import documentRoutes from "./document.routes.js";
import projectRoutes from "./project.routes.js";
import permissionRoutes from "./permission.routes.js";
import commanRoutes from "./dashboard.routes.js";

const router = express.Router();

// Mount all routes
router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/donors", donorRoutes);
router.use("/vendors", vendorRoutes);
router.use("/departments", departmentRoutes);
router.use("/designations", designationRoutes);
router.use("/documents", documentRoutes);
router.use("/projects", projectRoutes);
router.use("/permissions", permissionRoutes);
router.use("/", commanRoutes);

export default router;
