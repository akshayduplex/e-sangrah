import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        maxlength: 100
    },
    priority: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },
    addedBy: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    },
    updatedBy: {
        name: { type: String },
        email: { type: String },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    add_date: {
        type: Date,
        default: Date.now
    },
    updated_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});


// Pre-save hook to update `updated_date` automatically
departmentSchema.pre("save", function (next) {
    this.updated_date = Date.now();
    next();
});

const Department = mongoose.model("Department", departmentSchema);

export default Department;
