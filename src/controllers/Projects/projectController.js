import mongoose, { isValidObjectId } from "mongoose";
import Project from "../../models/Project.js";
import { successResponse, failResponse, errorResponse } from "../../utils/responseHandler.js";
import Department from "../../models/Departments.js";
import User from "../../models/User.js";

// Create a new project
export const createProject = async (req, res) => {
    try {
        const body = req.body;
        const user = req.user;

        // Validate required fields
        const requiredFields = [
            "projectName",
            "projectCode",
            "department",
            "projectManager",
            "projectStartDate",
            "projectEndDate"
        ];

        for (const field of requiredFields) {
            if (!body[field]) {
                return failResponse(
                    res,
                    `Missing required field: ${field}`,
                    400
                );
            }
        }

        // Ensure department and projectManager are valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(body.department)) {
            return failResponse(res, "Invalid department ID", 400);
        }

        if (!mongoose.Types.ObjectId.isValid(body.projectManager)) {
            return failResponse(res, "Invalid projectManager ID", 400);
        }

        // Convert dates to proper Date objects
        const startDate = new Date(body.projectStartDate);
        const endDate = new Date(body.projectEndDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return failResponse(res, "Invalid date format", 400);
        }

        // Create new project
        const project = new Project({
            ...body,
            projectCode: body.projectCode,
            department: body.department,
            projectManager: body.projectManager,
            projectStartDate: startDate,
            projectEndDate: endDate,
            createdBy: user._id
        });

        await project.save();

        return successResponse(res, project, "Project created successfully", 201);

    } catch (err) {
        // Handle duplicate projectCode
        if (err.code === 11000 && err.keyPattern && err.keyPattern.projectCode) {
            return failResponse(res, "Project code already exists", 400);
        }

        return errorResponse(res, err);
    }
};

// Get all projects
export const getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find({}).lean();
        return successResponse(res, projects, "Projects fetched successfully");
    } catch (err) {
        return errorResponse(res, err, "Failed to fetch projects");
    }
};

// Get a single project by ID
export const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).lean();

        if (!project) {
            return failResponse(res, "Project not found", 404);
        }

        return successResponse(res, project, "Project fetched successfully");
    } catch (err) {
        return errorResponse(res, err, "Failed to fetch project");
    }
};

// Update a project by ID
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return failResponse(res, "Project not found", 404);
        }

        // Only allow projectManager to update if they are the manager
        if (req.user.profile_type === "manager" && !project.canManage(req.user._id)) {
            return failResponse(res, "Unauthorized to update this project", 403);
        }

        Object.assign(project, body);
        await project.save();

        return successResponse(res, project, "Project updated successfully");
    } catch (err) {
        if (err.code === 11000 && err.keyPattern?.projectCode) {
            return failResponse(res, "Project code already exists", 400);
        }
        return errorResponse(res, err);
    }
};

// Delete a project by ID
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id);

        if (!project) {
            return failResponse(res, "Project not found", 404);
        }

        await project.deleteOne();
        return successResponse(res, null, "Project deleted successfully");
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get projects by status
export const getProjectsByStatus = async (req, res) => {
    try {
        const { projectStatus } = req.params;
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const validStatuses = ["Planned", "Active", "OnHold", "Completed", "Cancelled"];
        if (!validStatuses.includes(projectStatus)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const query = { projectStatus: projectStatus, isActive: true };
        const total = await Project.countDocuments(query);

        const projects = await Project.find(query)
            .populate("department", "name")
            .populate("projectManager", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            projectStatus,
            count: projects.length,
            data: projects,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalResults: total
            }
        });
    } catch (error) {
        console.error("Error fetching projects by status:", error);
        res.status(500).json({ success: false, message: "Server error while fetching projects by status" });
    }
};

// Get projects by department
export const getProjectsByDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!isValidObjectId(departmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid department ID'
            });
        }

        // Check if department exists
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: [
                { path: 'department', select: 'name' },
                { path: 'projectManager', select: 'name email' }
            ]
        };

        const projects = await Project.paginate(
            { department: departmentId, isActive: true },
            options
        );

        res.status(200).json({
            success: true,
            department: department.name,
            count: projects.totalDocs,
            data: projects.docs,
            pagination: {
                page: projects.page,
                limit: projects.limit,
                totalPages: projects.totalPages,
                totalResults: projects.totalDocs
            }
        });
    } catch (error) {
        console.error('Error fetching projects by department:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching projects by department'
        });
    }
};

// Get projects by manager
export const getProjectsByManager = async (req, res) => {
    try {
        const { managerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!isValidObjectId(managerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manager ID'
            });
        }

        // Check if manager exists
        const manager = await User.findById(managerId);
        if (!manager || !manager.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Manager not found or inactive'
            });
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: [
                { path: 'department', select: 'name' },
                { path: 'projectManager', select: 'name email' }
            ]
        };

        const projects = await Project.paginate(
            { projectManager: managerId, isActive: true },
            options
        );

        res.status(200).json({
            success: true,
            manager: manager.name,
            count: projects.totalDocs,
            data: projects.docs,
            pagination: {
                page: projects.page,
                limit: projects.limit,
                totalPages: projects.totalPages,
                totalResults: projects.totalDocs
            }
        });
    } catch (error) {
        console.error('Error fetching projects by manager:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching projects by manager'
        });
    }
};

// Get overdue projects
export const getOverdueProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { projectEndDate: 1 },
            populate: [
                { path: 'department', select: 'name' },
                { path: 'projectManager', select: 'name email' }
            ]
        };

        const projects = await Project.paginate(
            {
                projectEndDate: { $lt: new Date() },
                projectStatus: { $ne: 'Completed' },
                isActive: true
            },
            options
        );

        res.status(200).json({
            success: true,
            count: projects.totalDocs,
            data: projects.docs,
            pagination: {
                page: projects.page,
                limit: projects.limit,
                totalPages: projects.totalPages,
                totalResults: projects.totalDocs
            }
        });
    } catch (error) {
        console.error('Error fetching overdue projects:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching overdue projects'
        });
    }
};

// Get upcoming deadlines
export const getUpcomingDeadlines = async (req, res) => {
    try {
        const { days = 7, page = 1, limit = 10 } = req.query;
        const upcomingDate = new Date();
        upcomingDate.setDate(upcomingDate.getDate() + parseInt(days));

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { projectEndDate: 1 },
            populate: [
                { path: 'department', select: 'name' },
                { path: 'projectManager', select: 'name email' }
            ]
        };

        const projects = await Project.paginate(
            {
                projectEndDate: {
                    $gte: new Date(),
                    $lte: upcomingDate
                },
                projectStatus: { $in: ['Planned', 'Active', 'OnHold'] },
                isActive: true
            },
            options
        );

        res.status(200).json({
            success: true,
            days: parseInt(days),
            count: projects.totalDocs,
            data: projects.docs,
            pagination: {
                page: projects.page,
                limit: projects.limit,
                totalPages: projects.totalPages,
                totalResults: projects.totalDocs
            }
        });
    } catch (error) {
        console.error('Error fetching upcoming deadlines:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching upcoming deadlines'
        });
    }
};

// Bulk update projects
export const bulkUpdateProjects = async (req, res) => {
    try {
        const { projectIds, updateData } = req.body;

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Project IDs array is required'
            });
        }

        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Update data object is required'
            });
        }

        // Validate all project IDs
        const invalidIds = projectIds.filter(id => !isValidObjectId(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project IDs',
                invalidIds
            });
        }

        // Perform bulk update
        const result = await Project.updateMany(
            { _id: { $in: projectIds } },
            { ...updateData, updatedBy: req.user._id },
            { runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: `Successfully updated ${result.modifiedCount} projects`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during bulk update'
        });
    }
};

// Export projects
export const exportProjects = async (req, res) => {
    try {
        const { format = 'json', filters = {} } = req.query;

        // Build filter based on query params
        const filter = { isActive: true };

        if (filters.status) filter.projectStatus = filters.status;
        if (filters.department && isValidObjectId(filters.department)) {
            filter.department = filters.department;
        }
        if (filters.manager && isValidObjectId(filters.manager)) {
            filter.projectManager = filters.manager;
        }

        const projects = await Project.find(filter)
            .populate('department', 'name')
            .populate('projectManager', 'name email')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            const csvData = projects.map(project => ({
                'Project Name': project.projectName,
                'Project Code': project.projectCode,
                'Project Type': project.projectType || '',
                'Department': project.department?.name || '',
                'Project Manager': project.projectManager?.name || '',
                'Start Date': project.projectStartDate.toISOString().split('T')[0],
                'End Date': project.projectEndDate.toISOString().split('T')[0],
                'Status': project.projectStatus,
                'Priority': project.priority
            }));

            // Set headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=projects.csv');

            // Create CSV string
            const csvString = json2csv.parse(csvData);
            return res.status(200).send(csvString);
        }

        // Default to JSON format
        res.status(200).json({
            success: true,
            count: projects.length,
            format: 'json',
            data: projects
        });
    } catch (error) {
        console.error('Error exporting projects:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while exporting projects'
        });
    }
};

// Clone project
export const cloneProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Create a clone with a new project code
        const clonedProject = new Project({
            ...project.toObject(),
            _id: undefined,
            projectCode: `${project.projectCode}-COPY-${Date.now()}`,
            projectName: `${project.projectName} (Copy)`,
            projectStatus: 'Planned',
            isActive: true,
            createdAt: undefined,
            updatedAt: undefined,
            createdBy: req.user._id
        });

        await clonedProject.save();
        await clonedProject.populate('department', 'name');
        await clonedProject.populate('projectManager', 'name email');

        res.status(201).json({
            success: true,
            message: 'Project cloned successfully',
            data: clonedProject
        });
    } catch (error) {
        console.error('Error cloning project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while cloning project'
        });
    }
};

// Archive project (soft delete)
export const archiveProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findByIdAndUpdate(
            id,
            { isActive: false, updatedBy: req.user._id },
            { new: true }
        ).populate('department', 'name')
            .populate('projectManager', 'name email');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project archived successfully',
            data: project
        });
    } catch (error) {
        console.error('Error archiving project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while archiving project'
        });
    }
};

// Restore archived project
export const restoreProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findByIdAndUpdate(
            id,
            { isActive: true, updatedBy: req.user._id },
            { new: true }
        ).populate('department', 'name')
            .populate('projectManager', 'name email');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project restored successfully',
            data: project
        });
    } catch (error) {
        console.error('Error restoring project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while restoring project'
        });
    }
};

// Update project status
export const updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["Planned", "Active", "OnHold", "Completed", "Cancelled"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findByIdAndUpdate(
            id,
            { projectStatus: status, updatedBy: req.user._id },
            { new: true, runValidators: true }
        ).populate('department', 'name')
            .populate('projectManager', 'name email');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project status updated successfully',
            data: project
        });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating project status'
        });
    }
};

// Add donor to project
export const addDonorToProject = async (req, res) => {
    try {
        const { id } = req.params;
        const donorData = req.body;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Add donor to project
        project.donor.push(donorData);
        project.updatedBy = req.user._id;

        await project.save();

        // Proper way to populate multiple fields
        await project.populate([
            { path: 'department', select: 'name' },
            { path: 'projectManager', select: 'name email' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Donor added to project successfully',
            data: project
        });
    } catch (error) {
        console.error('Error adding donor to project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding donor to project'
        });
    }
};

// Update donor in project
export const updateDonorInProject = async (req, res) => {
    try {
        const { id, donorId } = req.params;
        const donorData = req.body;

        if (!isValidObjectId(id) || !isValidObjectId(donorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project or donor ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Find and update donor
        const donorIndex = project.donor.findIndex(d => d._id.toString() === donorId);

        if (donorIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Donor not found in project'
            });
        }

        project.donor[donorIndex] = { ...project.donor[donorIndex].toObject(), ...donorData };
        project.updatedBy = req.user._id;

        await project.save();
        await project.populate('department', 'name')
            .populate('projectManager', 'name email');

        res.status(200).json({
            success: true,
            message: 'Donor updated successfully',
            data: project
        });
    } catch (error) {
        console.error('Error updating donor:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating donor'
        });
    }
};

// Remove donor from project
export const removeDonorFromProject = async (req, res) => {
    try {
        const { id, donorId } = req.params;

        if (!isValidObjectId(id) || !isValidObjectId(donorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project or donor ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Remove donor from project
        project.donor = project.donor.filter(d => d._id.toString() !== donorId);
        project.updatedBy = req.user._id;

        await project.save();
        await project.populate('department', 'name')
            .populate('projectManager', 'name email');

        res.status(200).json({
            success: true,
            message: 'Donor removed from project successfully',
            data: project
        });
    } catch (error) {
        console.error('Error removing donor from project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing donor from project'
        });
    }
};

// Add vendor to project (similar to donor methods)
export const addVendorToProject = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorData = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        project.vendor.push(vendorData);
        project.updatedBy = req.user._id;

        await project.save();

        res.status(200).json({
            success: true,
            message: 'Vendor added to project successfully',
            data: project
        });
    } catch (error) {
        console.error('Error adding vendor to project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding vendor to project'
        });
    }
};

// Update vendor in project
export const updateVendorInProject = async (req, res) => {
    try {
        const { id, vendorId } = req.params;
        const vendorData = req.body;

        if (!isValidObjectId(id) || !isValidObjectId(vendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project or vendor ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const vendorIndex = project.vendor.findIndex(v => v._id.toString() === vendorId);

        if (vendorIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found in project'
            });
        }

        project.vendor[vendorIndex] = { ...project.vendor[vendorIndex].toObject(), ...vendorData };
        project.updatedBy = req.user._id;

        await project.save();

        res.status(200).json({
            success: true,
            message: 'Vendor updated successfully',
            data: project
        });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating vendor'
        });
    }
};

// Remove vendor from project
export const removeVendorFromProject = async (req, res) => {
    try {
        const { id, vendorId } = req.params;

        if (!isValidObjectId(id) || !isValidObjectId(vendorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project or vendor ID'
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        project.vendor = project.vendor.filter(v => v._id.toString() !== vendorId);
        project.updatedBy = req.user._id;

        await project.save();

        res.status(200).json({
            success: true,
            message: 'Vendor removed from project successfully',
            data: project
        });
    } catch (error) {
        console.error('Error removing vendor from project:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing vendor from project'
        });
    }
};

// Get project timeline
export const getProjectTimeline = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid project ID'
            });
        }

        const project = await Project.findById(id)
            .populate('department', 'name')
            .populate('projectManager', 'name email');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Calculate timeline data
        const timeline = {
            startDate: project.projectStartDate,
            endDate: project.projectEndDate,
            currentDate: new Date(),
            duration: Math.ceil((project.projectEndDate - project.projectStartDate) / (1000 * 60 * 60 * 24)),
            daysElapsed: Math.ceil((new Date() - project.projectStartDate) / (1000 * 60 * 60 * 24)),
            daysRemaining: Math.ceil((project.projectEndDate - new Date()) / (1000 * 60 * 60 * 24)),
            completionPercentage: Math.min(100, Math.max(0,
                ((new Date() - project.projectStartDate) / (project.projectEndDate - project.projectStartDate)) * 100
            )),
            isOverdue: project.projectEndDate < new Date() && project.projectStatus !== 'Completed'
        };

        res.status(200).json({
            success: true,
            data: {
                project: {
                    _id: project._id,
                    projectName: project.projectName,
                    projectCode: project.projectCode,
                    projectStatus: project.projectStatus
                },
                timeline
            }
        });
    } catch (error) {
        console.error('Error fetching project timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching project timeline'
        });
    }
};

// Search projects with advanced filtering
export const searchProjects = async (req, res) => {
    try {
        const { q, status, department, manager, priority, startDate, endDate, page = 1, limit = 10 } = req.query;

        // Build search query
        const query = { isActive: true };

        // Text search
        if (q) {
            query.$or = [
                { projectName: { $regex: q, $options: 'i' } },
                { projectCode: { $regex: q, $options: 'i' } },
                { projectDescription: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ];
        }

        // Filter by status
        if (status) {
            query.projectStatus = status;
        }

        // Filter by department
        if (department && isValidObjectId(department)) {
            query.department = department;
        }

        // Filter by manager
        if (manager && isValidObjectId(manager)) {
            query.projectManager = manager;
        }

        // Filter by priority
        if (priority) {
            query.priority = priority;
        }

        // Date range filter
        if (startDate || endDate) {
            query.projectStartDate = {};
            if (startDate) query.projectStartDate.$gte = new Date(startDate);
            if (endDate) query.projectStartDate.$lte = new Date(endDate);
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: [
                { path: 'department', select: 'name' },
                { path: 'projectManager', select: 'name email' }
            ]
        };

        const projects = await Project.paginate(query, options);

        res.status(200).json({
            success: true,
            query: { q, status, department, manager, priority, startDate, endDate },
            count: projects.totalDocs,
            data: projects.docs,
            pagination: {
                page: projects.page,
                limit: projects.limit,
                totalPages: projects.totalPages,
                totalResults: projects.totalDocs
            }
        });
    } catch (error) {
        console.error('Error searching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while searching projects'
        });
    }
};