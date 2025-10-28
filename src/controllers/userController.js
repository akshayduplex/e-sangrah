import User from "../models/User.js";
import { validationResult } from "express-validator";
import { generateRandomPassword } from "../helper/GenerateRandomPassword.js";
import { sendEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";
import Department from "../models/Departments.js";
import Designation from "../models/Designation.js";
import Project from "../models/Project.js";
import UserPermission from "../models/UserPermission.js";
import Menu from "../models/Menu.js";


//page routes controllers

// GET /users/list
export const listUsers = (req, res) => {
    res.render("pages/registerations/user-listing", {
        title: "E-Sangrah - Users-List",
        user: req.user
    });
};

// GET /users/register
export const showRegisterForm = async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" }).sort({ name: 1 }).lean();

        res.render("pages/registerations/user-registration", {
            title: "E-Sangrah - Register",
            departments,
            designations,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading user registration:", err);
        res.status(500).send("Internal Server Error");
    }
};

// GET /users/:mode/:id
export const viewOrEditUser = async (req, res) => {
    try {
        const { mode, id } = req.params;

        const user = await User.findById(id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        if (!user) return res.status(404).send("User not found");

        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        res.render("pages/registerations/user-form", {
            title: `User - ${user.name}`,
            user,
            departments,
            designations,
            viewOnly: mode === "view"
        });
    } catch (err) {
        logger.error(err);
        res.status(500).send("Internal Server Error");
    }
};

// API controllers

// Register user with profile type 'user'
export const registerUser = async (req, res) => {
    try {
        const { name, email, phone_number, employee_id, department, designation, address } = req.body;
        let profile_image = null;

        if (req.file) {
            profile_image = `/uploads/general/${req.file.filename}`;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        // Generate random password
        const randomPassword = generateRandomPassword();

        // Create new user
        const newUser = new User({
            name,
            email,
            phone_number,
            raw_password: randomPassword,
            profile_type: "user",
            profile_image,
            userDetails: {
                employee_id,
                department,
                designation,
            },
            address
        });

        await newUser.save();

        // === Assign ALL MENU PERMISSIONS to this user ===
        const allMenus = await Menu.find({});
        if (allMenus.length > 0) {
            const permissionDocs = allMenus.map(menu => ({
                user_id: newUser._id,
                menu_id: menu._id,
                permissions: {
                    read: true,
                    write: true,
                    delete: true
                },
                assigned_by: {
                    user_id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                },
            }));

            await UserPermission.insertMany(permissionDocs);
        }

        // === Send Email ===
        const htmlContent = `
            <p>Hello ${name},</p>
            <p>Your account has been created successfully.</p>
            <ul>
                <li><strong>Employee ID:</strong> ${employee_id}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${randomPassword}</li>
            </ul>
            <p>Please log in and change your password immediately.</p>
            <p>Thank you.</p>
        `;

        await sendEmail({
            to: email,
            subject: "Your Account Has Been Created",
            html: htmlContent,
            fromName: "Support Team",
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully and assigned all menu permissions.",
            data: { user: newUser },
        });

    } catch (error) {
        logger.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get all users with profile type 'user'
export const getAllUsers = async (req, res) => {
    try {
        let profile_type = req.query.profile_type || "user";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Build filter
        const filter = {
            profile_type,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                ...(search
                    ? [{ $expr: { $regexMatch: { input: { $toString: "$phone_number" }, regex: search, options: "i" } } }]
                    : [])
            ]
        };

        // Total count
        const total = await User.countDocuments(filter);

        // Fetch users with pagination and sorting
        const users = await User.find(filter)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .select("-password -raw_password")
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const mappedUsers = users.map(user => ({
            _id: user._id,
            name: user.name || "-",
            email: user.email || "-",
            phone_number: user.phone_number || "-",
            profile_type: user.profile_type,
            status: user.status || "-",
            userDetails: {
                department: user.userDetails?.department || null,
                designation: user.userDetails?.designation || null
            },
            lastLogin: user.lastLogin || null,
            createdAt: user.createdAt
        }));

        res.json({
            success: true,
            users: mappedUsers,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("DataTable error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const searchUsers = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = "", profile_type = "user", projectId } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        let users = [];
        let total = 0;

        // If donor or vendor, fetch from Project
        if ((profile_type === "donor" || profile_type === "vendor") && projectId) {
            const project = await Project.findById(projectId)
                .populate({
                    path: profile_type, // "donor" or "vendor"
                    select: "name email",
                    match: search ? { name: { $regex: search, $options: "i" } } : {}
                })
                .lean();

            if (project) {
                users = project[profile_type] || [];
                total = users.length;
                // Apply pagination manually
                const start = (page - 1) * limit;
                const end = start + limit;
                users = users.slice(start, end);
            }
        } else {
            // Default: search regular users
            const filter = { profile_type };

            if (search) filter.name = { $regex: search, $options: "i" };

            users = await User.find(filter)
                .select("name email")
                .limit(limit)
                .skip((page - 1) * limit)
                .sort({ name: 1 })
                .lean();

            total = await User.countDocuments(filter);
        }

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            users,
            pagination: {
                total,
                currentPage: page,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error("Get users error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get single user by ID
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .select("-password -raw_password");

        if (!user || user.profile_type !== "user") {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        logger.error("Get user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array(),
            });
        }

        const { name, phone_number, department, designation_id, status, employee_id } = req.body;

        const user = await User.findById(req.params.id);
        if (!user || user.profile_type !== "user") {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (name) user.name = name;
        if (phone_number) user.phone_number = phone_number;
        if (status) user.status = status;

        if (!user.userDetails) user.userDetails = {};

        if (employee_id) user.userDetails.employee_id = employee_id;
        if (department) user.userDetails.department = department;
        if (designation_id) user.userDetails.designation = designation_id;

        await user.save();

        const updatedUser = await User.findById(user._id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .select("-password -raw_password");

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        logger.error("Update user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Delete user
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user || user.profile_type !== "user") {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Use deleteOne() on the document
        await user.deleteOne();

        // await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        logger.error("Delete user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

