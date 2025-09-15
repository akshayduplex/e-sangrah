import User from "../../models/User.js";
import { validationResult } from "express-validator";
import registration from "../../emailTemplates/registeration.js";
import { generateEmployeeId } from "../../helper/generateEmployeeId.js";
import { generateRandomPassword } from "../../helper/generateRandomPassword.js";

// Register user with profile type 'user'
export const registerUser = async (req, res) => {
    try {
        const { fullName, email, phone_number, department, designation_id, address } = req.body;
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

        // Generate employee ID
        const employee_id = await generateEmployeeId();

        // Generate random password
        const randomPassword = generateRandomPassword();

        // Create new user
        const newUser = new User({
            name: fullName,
            email,
            phone_number,
            raw_password: randomPassword, // will be hashed by pre-save middleware
            profile_type: "user",
            profile_image,
            userDetails: {
                employee_id,
                department,
                designation_id,
            },
            address
        });

        // Save user to database
        await newUser.save();

        // Send email with password
        await registration({
            to: email,
            subject: "Your Account Has Been Created",
            text: `Hello ${fullName},\n\nYour account has been created successfully.\n\nEmployee ID: ${employee_id}\nEmail: ${email}\nPassword: ${randomPassword}\n\nPlease log in and change your password immediately.\n\nThank you.`
        });
        // Return success response
        res.status(201).json({
            success: true,
            message: "User registered successfully. Login details sent to email.",
            data: {
                user: newUser.toJSON()
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
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
        const {
            page = 1,
            limit = 10,
            search = "",
            department,
            status,
        } = req.query;

        const filter = { profile_type: "user" };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { "userDetails.employee_id": { $regex: search, $options: "i" } },
            ];
        }

        if (department) {
            filter["userDetails.department"] = department;
        }

        if (status) {
            filter.status = status;
        }

        const users = await User.find(filter)
            .populate("userDetails.department", "name")
            .populate("designation_id", "name")
            .select("-password -raw_password")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                users,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total,
            },
        });
    } catch (error) {
        console.error("Get users error:", error);
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
            .populate("designation_id", "name")
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
        console.error("Get user error:", error);
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

        const { name, phone_number, department, designation_id, status } = req.body;

        const user = await User.findById(req.params.id);

        if (!user || user.profile_type !== "user") {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Update fields
        if (name) user.name = name;
        if (phone_number) user.phone_number = phone_number;
        if (designation_id) user.designation_id = designation_id;
        if (status) user.status = status;
        if (department) user.userDetails.department = department;

        await user.save();

        const updatedUser = await User.findById(user._id)
            .populate("userDetails.department", "name")
            .populate("designation_id", "name")
            .select("-password -raw_password");

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Update user error:", error);
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

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};