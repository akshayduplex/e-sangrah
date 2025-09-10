import express from "express";
import * as projectController from "../../controllers/Projects/projectController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Project CRUD
router.post("/", authenticate, projectController.createProject);
router.get("/all-projects", authenticate, projectController.getAllProjects);
router.get("/all-managers/:id", authenticate, projectController.getAllManagers);
router.get("/", authenticate, projectController.getProjects);
router.get("/:id", authenticate, projectController.getProjectById);
router.put("/:id", authenticate, projectController.updateProject);
router.delete("/:id", authenticate, projectController.deleteProject);

// Team management
router.post("/:id/team", authenticate, projectController.addTeamMember);
router.delete("/:id/team/:memberId", authenticate, projectController.removeTeamMember);


// Export router as default
export default router;
