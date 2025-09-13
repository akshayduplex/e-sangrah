// import User from "../../models/User.js";

// // Create a new user
// export const createUser = async (req, res) => {
//     try {
//         // Force profile_type to "user" for this endpoint
//         req.body.profile_type = "user";

//         // Handle profile image upload if present
//         if (req.file) {
//             req.body.profile_image = req.file.path; // Match model field name
//         }

//         // Validate required userDetails for profile_type "user"
//         if (!req.body.userDetails || !req.body.userDetails.employee_id) {
//             return res.status(400).json({
//                 message: "Employee ID is required for user profile type",
//             });
//         }

//         const user = new User(req.body);
//         const savedUser = await user.save();

//         res.status(201).json(savedUser);
//     } catch (error) {
//         // Handle duplicate email or other mongoose validation errors
//         if (error.code === 11000) {
//             return res.status(400).json({ message: "Email already exists" });
//         }
//         res.status(400).json({ message: error.message });
//     }
// };

// // Get all users
// export const getAllUsers = async (req, res) => {
//     try {
//         const users = await User.find()
//             .populate("designation_id")
//             .populate("department");
//         res.status(200).json(users);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // Get a single user by ID
// export const getUserById = async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id)
//             .populate("designation_id")
//             .populate("department");
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.status(200).json(user);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // Update a user by ID
// export const updateUser = async (req, res) => {
//     try {
//         // Handle file upload if present
//         if (req.file) {
//             req.body.profileImage = req.file.path;
//         }

//         const updatedUser = await User.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );
//         if (!updatedUser) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.status(200).json(updatedUser);
//     } catch (error) {
//         res.status(400).json({ message: error.message });
//     }
// };

// // Delete a user by ID
// export const deleteUser = async (req, res) => {
//     try {
//         const deletedUser = await User.findByIdAndDelete(req.params.id);
//         if (!deletedUser) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.status(200).json({ message: "User deleted successfully" });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

import User from "../../models/User.js";
// import Department from "../../models/Department.js";
// import Designation from "../../models/Designation.js";
import { validationResult } from "express-validator";
import crypto from "crypto";
import registration from "../../emailTemplates/registeration.js";

// Generate employee ID
const generateEmployeeId = async () => {
    const count = await User.countDocuments({ profile_type: "user" });
    return `EMP${String(count + 1).padStart(4, "0")}`;
};

// Helper to generate random password
const generateRandomPassword = (length = 10) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
};

// Register user with profile type 'user'
export const registerUser = async (req, res) => {
    try {
        const { fullName, email, phone_number, department, designation_id, address } = req.body;
        let profile_image = null;

        if (req.file) {
            profile_image = `/uploads/${req.file.profileImage}`;
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

        // Generate JWT token
        const token = newUser.generateAuthToken();

        // Return success response
        res.status(201).json({
            success: true,
            message: "User registered successfully. Login details sent to email.",
            data: {
                user: newUser.toJSON(),
                token,
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