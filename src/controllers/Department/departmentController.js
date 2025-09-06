const Department = require('../../models/Departments');
const mongoose = require('mongoose');
const { successResponse, failResponse, errorResponse } = require("../../utils/responseHandler");

// Get all active departments
exports.getAllDepartments = async () => {
    return await Department.find({ isActive: true })
        .select('name')
        .lean();
};

// Get department by ID
exports.getDepartmentById = async (req, res) => {
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
exports.getDepartmentStorage = async (req, res) => {
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
exports.createDepartment = async (req, res) => {
    try {
        const department = new Department(req.body);
        await department.save();
        return successResponse(res, department, 'Department created successfully', 201);
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Update department
exports.updateDepartment = async (req, res) => {
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
exports.deleteDepartment = async (req, res) => {
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
