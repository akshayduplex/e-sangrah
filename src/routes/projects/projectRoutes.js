import express from "express";
import * as projectController from "../../controllers/Projects/projectController.js";
import SyncService from "../../services/syncService.js";   // ✅ import default
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

// Sync route
router.post("/sync", async (req, res) => {
    try {
        const syncService = new SyncService();
        const result = await syncService.syncData();

        if (result.success) {
            req.flash("success", result.message);
        } else {
            req.flash("error", result.message);
        }

        res.redirect("/projects");
    } catch (error) {
        console.error("Error in sync route:", error);
        req.flash("error", "An error occurred during sync");
        res.redirect("/projects");
    }
});

// Export router as default
export default router;
