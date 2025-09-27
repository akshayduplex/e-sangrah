import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: null
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
    },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    projectManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["Draft", "Pending", "UnderReview", "Approved", "Rejected", "Archived"],
        default: "Draft"
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    metadata: {
        fileName: { type: String, trim: true },
        fileDescription: { type: String, trim: true },
        mainHeading: { type: String, trim: true }
    },
    compliance: {
        isCompliance: {
            type: Boolean,
            default: false
        },
        expiryDate: {
            type: Date,
            default: null
        },
        retentionPeriod: {
            type: Number, // in days
            default: null
        },
        complianceType: {
            type: String,
            trim: true
        }
    },
    files: [{
        file: {
            type: String, // Changed from ObjectId to String
            required: true
        },
        originalName: {
            type: String,
            required: true
        },
        version: {
            type: Number,
            default: 1
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    currentVersion: {
        type: Number,
        default: 1
    },
    signature: {
        fileName: { type: String },
        fileUrl: { type: String }
    },
    link: {
        type: String
    },
    // New fields
    sharedWith: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessLevel: { type: String, enum: ["view", "edit"], default: "view" },
        sharedAt: { type: Date, default: Date.now }
    }],
    remark: {
        type: String,
        trim: true,
        maxlength: 1000
    }

}, {
    timestamps: true
});

// Indexes
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ owner: 1 });
documentSchema.index({ "sharedWith.user": 1 });
documentSchema.index({ createdAt: 1 });
documentSchema.index({ "compliance.expiryDate": 1 });

// Virtuals
documentSchema.virtual("isExpired").get(function () {
    return this.compliance.expiryDate ? this.compliance.expiryDate < new Date() : false;
});

// Ensure only one primary file
documentSchema.pre("save", function (next) {
    if (this.isModified("files")) {
        const primaryFiles = this.files.filter(file => file.isPrimary);
        if (primaryFiles.length > 1) {
            for (let i = 1; i < primaryFiles.length; i++) {
                primaryFiles[i].isPrimary = false;
            }
        }
    }
    next();
});

const Document = mongoose.model("Document", documentSchema);
export default Document;
