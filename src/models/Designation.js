// models/Designation.js
import mongoose from "mongoose";

const designationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    priority: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    added_by: {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        email: { type: String, required: true }
    },
    updated_by: {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String },
        email: { type: String }
    },
    add_date: {
        type: Date,
        default: Date.now
    },
    updated_date: {
        type: Date,
        default: Date.now
    }
});

// Middleware to auto-update updated_date
designationSchema.pre("save", function (next) {
    this.updated_date = Date.now();
    next();
});

const Designation = mongoose.model("Designation", designationSchema);

export default Designation;
