import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import checkUserPermission from "../../middlewares/checkPermission.js";
import Project, { ProjectType } from "../../models/Project.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import Designation from "../../models/Designation.js";
import { formatDateDDMMYYYY } from "../../utils/formatDate.js";

const router = express.Router();

// Helper: format date as ISO YYYY-MM-DD
function formatDateISO(date) {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
}

// Helper: render Project Details page
async function renderProjectDetails(res, projectId = null, userDetails) {
    try {
        const project = projectId
            ? await Project.findById(projectId)
                .populate("projectManager", "name")
                .populate("projectCollaborationTeam", "name")
                .populate("donor", "name profile_type")
                .populate("vendor", "name profile_type")
                .populate("projectType", "name")
                .lean()
            : null;

        if (project) {
            project.projectStartDateFormatted = formatDateDDMMYYYY(project.projectStartDate);
            project.projectEndDateFormatted = formatDateDDMMYYYY(project.projectEndDate);

            project.projectStartDateISO = formatDateISO(project.projectStartDate);
            project.projectEndDateISO = formatDateISO(project.projectEndDate);
        }

        const [users, departments, donors, vendors, projectTypes] = await Promise.all([
            User.find({ profile_type: "user", status: "Active" }, "name").lean(),
            Department.find({ status: "Active" }, "name").lean(),
            User.find({ profile_type: "donor" }, "name").lean(),
            User.find({ profile_type: "vendor" }, "name").lean(),
            ProjectType.find({ status: "Active", isActive: true }, "name").lean()
        ]);

        res.render("pages/projects/project-details", {
            title: project ? "Project Details" : "Add Project",
            project,
            users,
            departments,
            donors,
            vendors,
            projectTypes,
            user: userDetails
        });
    } catch (err) {
        console.error("Error loading project:", err);
        res.status(500).render("pages/projects/project-details", {
            title: "Project Details",
            project: null,
            users: [],
            departments: [],
            donors: [],
            vendors: [],
            projectTypes: [],
            user: userDetails,
            error: "Unable to load project details."
        });
    }
}

// Projects list page
router.get("/list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/projects/projectList", {
            title: "E-Sangrah - Projects List",
            designations,
            user: req.user
        });
    } catch (err) {
        console.error("Error loading project list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load project list"
        });
    }
});

// Project details without ID
router.get("/details", authenticate, checkUserPermission, async (req, res) => {
    await renderProjectDetails(res, null, req.user);
});

// Project details with ID
router.get("/:id/details", authenticate, checkUserPermission, async (req, res) => {
    await renderProjectDetails(res, req.params.id, req.user);
});

// Main Projects page
router.get("/", authenticate, checkUserPermission, async (req, res) => {
    try {
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - Project List",
            messages: req.flash(),
        });
    } catch (err) {
        console.error("Error loading projects page:", err);
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - Project List",
            messages: { error: "Unable to load projects" },
            projects: [],
        });
    }
});

export default router;
