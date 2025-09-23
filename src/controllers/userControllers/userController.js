import User from "../../models/User.js";
import { validationResult } from "express-validator";
import registration from "../../emailTemplates/registeration.js";
import { generateEmployeeId } from "../../helper/generateEmployeeId.js";
import { generateRandomPassword } from "../../helper/generateRandomPassword.js";

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

        // Generate employee ID
        // const employee_id = await generateEmployeeId();

        // Generate random password
        const randomPassword = generateRandomPassword();

        // Create new user
        const newUser = new User({
            name,
            email,
            phone_number,
            raw_password: randomPassword, // will be hashed by pre-save middleware
            profile_type: "user",
            profile_image,
            userDetails: {
                employee_id,
                department,
                designation,
            },
            address
        });

        // Save user to database
        await newUser.save();

        // Send email with password
        await registration({
            to: email,
            subject: "Your Account Has Been Created",
            text: `Hello ${name},\n\nYour account has been created successfully.\n\nEmployee ID: ${employee_id}\nEmail: ${email}\nPassword: ${randomPassword}\n\nPlease log in and change your password immediately.\n\nThank you.`
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
        let { page = 1, limit = 10, search = "", department, designation, status, profile_type } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // default filter
        const filter = {};

        if (profile_type) {
            filter.profile_type = profile_type;
        } else {
            filter.profile_type = "user"; // fallback
        }
        // 🔎 search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { "userDetails.employee_id": { $regex: search, $options: "i" } },
            ];
        }

        // 🏢 filter by department ID
        if (department) {
            filter["userDetails.department"] = department;
        }

        // 📌 filter by designation ID
        if (designation) {
            filter["userDetails.designation"] = designation;
        }

        // ✅ filter by status
        if (status) {
            filter.status = status;
        }

        const users = await User.find(filter)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .select("-password -raw_password")
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const searchUsers = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = "" } = req.query;

        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        const filter = { profile_type: "user" }; // only users

        // Search by name
        if (search) {
            filter.name = { $regex: search, $options: "i" }; // case-insensitive
        }

        // Fetch only name
        const users = await User.find(filter)
            .select('name') // only name field
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ name: 1 }) // alphabetical
            .lean();

        const total = await User.countDocuments(filter);

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

        // Use deleteOne() on the document
        await user.deleteOne();

        // Alternatively, you could do:
        // await User.findByIdAndDelete(req.params.id);

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

