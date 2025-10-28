import mongoose from 'mongoose';
import { successResponse, failResponse, errorResponse } from '../utils/responseHandler.js';
import Designation from '../models/Designation.js';
import Menu from '../models/Menu.js';
import MenuAssignment from '../models/MenuAssignment.js';

//Page Controllers

// Render Add Designation page
export const showAddDesignationPage = (req, res) => {
    res.render("pages/designation/designation", {
        designation: null,
        user: req.user
    });
};

// Render Edit Designation page
export const showEditDesignationPage = async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);
        if (!designation) {
            req.flash("error", "Designation not found");
            return res.redirect("/designations/list");
        }

        res.render("pages/designation/designation", {
            designation,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading designation edit page:", err);
        req.flash("error", "Something went wrong");
        res.redirect("/designations/list");
    }
};

// Render Designation List page
export const showDesignationListPage = (req, res) => {
    res.render("pages/designation/designations-list", {
        title: "Designation List",
        user: req.user
    });
};

//API Controllers

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

export const searchDesignations = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        const query = { status: "Active" };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [data, total] = await Promise.all([
            Designation.find(query).select('name priority').skip(skip).limit(parseInt(limit)).lean(),
            Designation.countDocuments(query)
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
    const session = await Designation.startSession();
    session.startTransaction();

    try {
        if (!req.user) return failResponse(res, 'Unauthorized', 401);

        const designationData = {
            name: req.body.name,
            priority: req.body.priority || 0,
            status: req.body.status || 'Active',
            description: req.body.description || '',
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

        // Create Designation
        const designation = new Designation(designationData);
        await designation.save({ session });

        //  Fetch all menus
        const allMenus = await Menu.find({}, '_id').lean();

        // Prepare bulk MenuAssignment documents
        const assignments = allMenus.map(menu => ({
            designation_id: designation._id,
            menu_id: menu._id,
            permissions: {
                read: true,
                write: true,
                delete: true
            },
            assigned_date: new Date()
        }));

        // Insert all menu assignments
        if (assignments.length > 0) {
            await MenuAssignment.insertMany(assignments, { session });
        }

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return successResponse(res, designation, 'Designation created successfully and menus assigned');
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        // Handle duplicate name error
        if (err.code === 11000 && err.keyValue?.name) {
            return failResponse(res, 'Designation name already exists', 400);
        }

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
            name: req.body.name,
            priority: req.body.priority,
            status: req.body.status,
            description: req.body.description,
            updated_by: {
                user_id: req.user._id,
                name: req.user.name,
                email: req.user.email
            }
        };

        const designation = await Designation.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            context: 'query'
        });

        if (!designation) return failResponse(res, 'Designation not found', 404);
        return successResponse(res, designation, 'Designation updated successfully');
    } catch (err) {
        // Handle duplicate name error
        if (err.code === 11000 && err.keyValue?.name) {
            return failResponse(res, 'Designation name already exists', 400);
        }
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
