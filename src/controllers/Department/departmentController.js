import mongoose from 'mongoose';
import Department from '../../models/Departments.js';
import { successResponse, failResponse, errorResponse } from "../../utils/responseHandler.js";


// Get all active departments
export const getAllDepartments = async () => {
    return await Department.find({ isActive: true })
        .select('name')
        .lean();
};

// Get department by ID
export const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);

        const department = await Department.findById(id)
            .populate('manager', 'name email')
            .populate('parentDepartment', 'name code')
            .populate('childDepartments', 'name code');

        if (!department) return failResponse(res, 'Department not found', 404);

        return successResponse(res, department, 'Department fetched successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get department storage
export const getDepartmentStorage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);

        const department = await Department.findById(id);
        if (!department) return failResponse(res, 'Department not found', 404);

        // Assuming Department schema has getStorageUsage method
        const storageUsage = await department.getStorageUsage();
        const usagePercentage = (storageUsage / department.settings.maxStorage) * 100;

        const storageData = {
            used: storageUsage,
            total: department.settings.maxStorage,
            percentage: usagePercentage.toFixed(2),
            remaining: department.settings.maxStorage - storageUsage
        };

        return successResponse(res, storageData, 'Department storage fetched successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Create new department
export const createDepartment = async (req, res) => {
    try {
        const department = new Department(req.body);
        await department.save();
        return successResponse(res, department, 'Department created successfully', 201);
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Update department
export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid department ID', 400);

        const department = await Department.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        if (!department) return failResponse(res, 'Department not found', 404);
        return successResponse(res, department, 'Department updated successfully');
    } catch (err) {
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
