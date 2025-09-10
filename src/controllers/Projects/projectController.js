import mongoose from "mongoose";
import Project from "../../models/project.js";
import ProjectList from "../../models/Projects.js";
import { successResponse, failResponse, errorResponse } from "../../utils/responseHandler.js";
import ProjectCl from "../../models/Projects.js";

// Create Project
export const createProject = async (req, res) => {
    try {
        const body = req.body;
        const user = req.user;

        // Validate required fields
        if (!body.name || !body.code || !body.department || !Array.isArray(body.manager) || body.manager.length === 0 || !body.startDate || !body.endDate) {
            return failResponse(res, "Required fields: name, code, department, at least one manager, startDate, endDate", 400);
        }

        const project = new Project({ ...body, createdBy: user._id });
        await project.save();
        return successResponse(res, project, "Project created successfully", 201);

    } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.code) {
            return failResponse(res, "Project code already exists", 400);
        }
        return errorResponse(res, err);
    }
};

// Fetch all projects
export const getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find({}).lean();
        return successResponse(res, projects, "Projects fetched successfully");
    } catch (err) {
        return errorResponse(res, err, "Failed to fetch projects");
    }
};

// Get all managers of a project
export const getAllManagers = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid project ID", 400);

        const project = await Project.findById(id).populate("manager", "name email role");
        if (!project) return failResponse(res, "Project not found", 404);

        return successResponse(res, project.manager, "Project managers fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get projects with filters, pagination, search
export const getProjects = async (req, res) => {
    try {
        const { status, limit = 20, page = 1, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) filter.name = { $regex: search, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const projects = await Project.find(filter)
            .populate("department", "name") // get department name
            .populate("manager", "name email") // get manager info
            .populate("teamMembers.user", "name email") // get team member info
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Project.countDocuments(filter);

        // Map projects to table-friendly format
        const tableData = projects.map((proj, index) => ({
            index: index + 1,
            fileName: proj.name,
            lastModifiedOn: proj.updatedAt,
            owner: proj.manager.map(m => m.name).join(", "),
            department: proj.department?.name || "",
            project: proj.code,
            sharedWith: proj.teamMembers.map(t => t.user?.name).join(", "),
            tags: proj.tags.join(", "),
            metaData: {
                startDate: proj.startDate,
                endDate: proj.endDate,
                duration: proj.duration
            },
            createdOn: proj.createdAt,
            description: proj.description,
            remark: "", // can add logic for remarks if needed
            status: proj.status
        }));

        return successResponse(res, {
            projects: tableData,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        }, "Projects fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get project by ID
export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid project ID", 400);

        const projects = await Project.find({})
            .populate("department manager teamMembers.user", "name email role")
            .lean({ virtuals: true });

        if (!project) return failResponse(res, "Project not found", 404);

        return successResponse(res, project, "Project fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Update project
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid project ID", 400);

        const project = await Project.findById(id);
        if (!project) return failResponse(res, "Project not found", 404);

        if (!project.canManage(user._id)) return failResponse(res, "Permission denied. Only project manager can update.", 403);

        Object.assign(project, body);
        await project.save();

        return successResponse(res, project, "Project updated successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Delete project
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid project ID", 400);

        const project = await Project.findById(id);
        if (!project) return failResponse(res, "Project not found", 404);

        if (!project.canManage(user._id)) return failResponse(res, "Permission denied. Only project manager can delete.", 403);

        await project.deleteOne();
        return successResponse(res, {}, "Project deleted successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Add team member
export const addTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const memberData = req.body;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid project ID", 400);

        const project = await Project.findById(id);
        if (!project) return failResponse(res, "Project not found", 404);

        if (!project.canManage(user._id)) return failResponse(res, "Permission denied. Only project manager can add members.", 403);

        project.teamMembers.push({ ...memberData, addedBy: user._id });
        await project.save();

        return successResponse(res, project, "Team member added successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Remove team member
export const removeTeamMember = async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberId)) return failResponse(res, "Invalid IDs", 400);

        const project = await Project.findById(id);
        if (!project) return failResponse(res, "Project not found", 404);

        if (!project.canManage(user._id)) return failResponse(res, "Permission denied. Only project manager can remove members.", 403);

        project.teamMembers = project.teamMembers.filter(m => m.user.toString() !== memberId.toString());
        await project.save();

        return successResponse(res, project, "Team member removed successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};
