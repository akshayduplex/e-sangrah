const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        maxlength: 100
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        maxlength: 10
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    parentDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        maxStorage: {
            type: Number,
            default: 10737418240 // 10GB in bytes
        },
        allowedFileTypes: [{
            type: String,
            lowercase: true
        }],
        maxFileSize: {
            type: Number,
            default: 52428800 // 50MB in bytes
        }
    }
}, {
    timestamps: true
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ parentDepartment: 1 });
departmentSchema.index({ isActive: 1 });

// Virtual for child departments
departmentSchema.virtual("childDepartments", {
    ref: "Department",
    localField: "_id",
    foreignField: "parentDepartment"
});

// Virtual for department users
departmentSchema.virtual("users", {
    ref: "User",
    localField: "_id",
    foreignField: "department"
});

// Method to check storage usage (to be implemented with actual usage tracking)
departmentSchema.methods.getStorageUsage = async function () {
    // This would typically query documents and sum their sizes
    return 0; // Placeholder
};

// Method to check if file type is allowed
departmentSchema.methods.isFileTypeAllowed = function (fileType) {
    if (!this.settings.allowedFileTypes.length) return true;
    return this.settings.allowedFileTypes.includes(fileType.toLowerCase());
};

module.exports = mongoose.model("Department", departmentSchema);