import mongoose from 'mongoose';
import Department from '../models/Departments.js';
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import logger from '../utils/logger.js';

//Page Controllers

// Render Add Department page
export const showAddDepartmentPage = (req, res) => {
    res.render("pages/department/department", {
        title: "E-Sangrah - Department",
        user: req.user,
        department: null,
    });
};

// Department List page
export const showDepartmentListPage = (req, res) => {
    res.render("pages/department/departments-list", {
        title: "E-Sangrah - Departments-List",
        user: req.user
    });
};

// Edit Department page
export const showEditDepartmentPage = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id).lean();
        if (!department) return res.redirect("/departments/list");

        res.render("pages/department/department", {
            title: "E-Sangrah - Edit Department",
            department,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading department edit page:", err);
        res.redirect("/departments/list");
    }
};

//API Controllers

// Get all active departments
export const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find({})
            .select('name priority status addedBy add_date')
            .lean();
        return successResponse(res, departments, 'Departments fetched successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get all active departments
export const searchDepartments = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        const query = { status: "Active" };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [data, total] = await Promise.all([
            Department.find(query).select('name priority').skip(skip).limit(parseInt(limit)).lean(),
            Department.countDocuments(query)
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                more: skip + data.length < total
            }
        });
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);

        const department = await Department.findById(id).lean();
        if (!department) return failResponse(res, 'Department not found', 404);

        return successResponse(res, department, 'Department fetched successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Create new department
export const createDepartment = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const departmentData = {
            ...req.body,
            addedBy: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            }
        };

        const department = new Department(departmentData);
        await department.save();

        res.status(200).json({ message: 'Department added successfully!' });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: 'Failed to add department' });
    }
};

// Update department
export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);
        if (!req.user) return failResponse(res, 'Unauthorized', 401);

        const updateData = {
            ...req.body,
            updatedBy: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            },
            updated_date: Date.now()
        };

        const department = await Department.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!department) return failResponse(res, 'Department not found', 404);
        return successResponse(res, department, 'Department updated successfully');
    } catch (err) {
        logger.error(err);
        return errorResponse(res, err);
    }
};

// Delete department
export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);

        const deleted = await Department.findByIdAndDelete(id);
        if (!deleted) return failResponse(res, 'Department not found', 404);

        return successResponse(res, {}, 'Department deleted successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};
