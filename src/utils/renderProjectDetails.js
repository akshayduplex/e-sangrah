import Department from "../models/Departments.js";
import Project, { ProjectType } from "../models/Project.js";
import User from "../models/User.js";
import { formatDateDDMMYYYY, formatDateISO } from "./formatDate.js";
import logger from "./logger.js";

/**
 * renderProjectDetails
 * Render the project details page for viewing or editing.
 * Populates all related fields: project manager, collaboration team, donor, vendor, project type.
 * @param {Response} res Express response object
 * @param {string|null} projectId MongoDB ID of project (null for new project)
 * @param {Object} userDetails Logged-in user details
 */
export async function renderProjectDetails(res, projectId = null, userDetails) {
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
            ProjectType.find({ status: "Active", isActive: true }, "name").lean(),
        ]);

        res.render("pages/projects/project-details", {
            title: project ? "Project Details" : "Add Project",
            project,
            users,
            departments,
            donors,
            vendors,
            projectTypes,
            user: userDetails,
        });
    } catch (err) {
        logger.error("Error loading project:", err);
        res.status(500).render("pages/projects/project-details", {
            title: "Project Details",
            project: null,
            users: [],
            departments: [],
            donors: [],
            vendors: [],
            projectTypes: [],
            user: userDetails,
            error: "Unable to load project details.",
        });
    }
}