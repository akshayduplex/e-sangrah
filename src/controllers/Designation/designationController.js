import mongoose from 'mongoose';
import Designation from '../../models/Designation.js';
import { successResponse, failResponse, errorResponse } from '../../utils/responseHandler.js';

// Get all designations
export const getAllDesignations = async (req, res) => {
    try {
        const data = await Designation.find()
            // .populate('added_by.user_id', 'name email')
            .lean();
        res.json({ success: true, data });
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get designation by ID
export const getDesignationById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid designation ID', 400);

        const designation = await Designation.findById(id).lean();
        if (!designation) return failResponse(res, 'Designation not found', 404);

        return successResponse(res, designation, 'Designation fetched successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Create new designation
export const createDesignation = async (req, res) => {
    try {
        if (!req.user) return failResponse(res, 'Unauthorized', 401);

        const designationData = {
            ...req.body,
            added_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            },
            updated_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            }
        };

        const designation = new Designation(designationData);
        await designation.save();

        return successResponse(res, designation, 'Designation created successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Update designation
export const updateDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid designation ID', 400);
        if (!req.user) return failResponse(res, 'Unauthorized', 401);

        const updateData = {
            ...req.body,
            updated_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            },
            updated_date: Date.now()
        };

        const designation = await Designation.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!designation) return failResponse(res, 'Designation not found', 404);
        return successResponse(res, designation, 'Designation updated successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};

// Delete designation
export const deleteDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, 'Invalid designation ID', 400);

        const deleted = await Designation.findByIdAndDelete(id);
        if (!deleted) return failResponse(res, 'Designation not found', 404);

        return successResponse(res, {}, 'Designation deleted successfully');
    } catch (err) {
        return errorResponse(res, err);
    }
};
