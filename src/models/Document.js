import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ["Draft", "Pending", "UnderReview", "Approved", "Rejected", "Archived"],
        default: "Draft"
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: null
    },
    documentManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Shared with specific users
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        permission: {
            type: String,
            enum: ["view", "comment", "edit"],
            default: "view"
        },
        sharedAt: {
            type: Date,
            default: Date.now
        },
        sharedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }],
    // Shared with entire departments
    sharedWithDepartments: [{
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },
        permission: {
            type: String,
            enum: ["view", "comment", "edit"],
            default: "view"
        },
        sharedAt: {
            type: Date,
            default: Date.now
        },
        sharedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }],
    files: [{
        file: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
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
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    category: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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
    workflow: {
        currentStep: {
            type: Number,
            default: 0
        },
        steps: [{
            name: String,
            assignedTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            department: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Department"
            },
            status: {
                type: String,
                enum: ["pending", "inProgress", "completed", "rejected"],
                default: "pending"
            },
            dueDate: Date,
            completedAt: Date,
            comments: String
        }]
    },
    auditLog: [{
        action: {
            type: String,
            required: true
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    accessLog: [{
        accessedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        accessedAt: {
            type: Date,
            default: Date.now
        },
        action: {
            type: String,
            enum: ["view", "download", "preview"],
            default: "view"
        },
        ipAddress: String,
        userAgent: String
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    publicUrl: {
        type: String,
        default: null
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better performance
documentSchema.index({ title: "text", description: "text", tags: "text" });
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ owner: 1 });
documentSchema.index({ "sharedWith.user": 1 });
documentSchema.index({ "sharedWithDepartments.department": 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ "compliance.expiryDate": 1 });
documentSchema.index({ createdAt: 1 });
documentSchema.index({ updatedAt: 1 });

// Virtual for expired documents
documentSchema.virtual("isExpired").get(function () {
    if (!this.compliance.expiryDate) return false;
    return this.compliance.expiryDate < new Date();
});

// Method to check if user has access
documentSchema.methods.hasAccess = function (userId, departmentId) {
    // Owner always has access
    if (this.owner.toString() === userId.toString()) return true;

    // Public documents
    if (this.isPublic) return true;

    // Check shared with users
    const userShared = this.sharedWith.find(share =>
        share.user.toString() === userId.toString()
    );
    if (userShared) return true;

    // Check shared with departments
    const departmentShared = this.sharedWithDepartments.find(share =>
        share.department.toString() === departmentId.toString()
    );
    if (departmentShared) return true;

    return false;
};

// Method to check user permission level
documentSchema.methods.getUserPermission = function (userId, departmentId) {
    // Owner has full permissions
    if (this.owner.toString() === userId.toString()) return "edit";

    // Check shared with users
    const userShared = this.sharedWith.find(share =>
        share.user.toString() === userId.toString()
    );
    if (userShared) return userShared.permission;

    // Check shared with departments
    const departmentShared = this.sharedWithDepartments.find(share =>
        share.department.toString() === departmentId.toString()
    );
    if (departmentShared) return departmentShared.permission;

    return null;
};

// Method to add to audit log
documentSchema.methods.addAuditLog = function (action, performedBy, details = {}) {
    this.auditLog.push({
        action,
        performedBy,
        details
    });
    return this.save();
};

// Method to add to access log
documentSchema.methods.addAccessLog = function (accessedBy, action, ipAddress, userAgent) {
    if (action === "view") this.viewCount += 1;
    if (action === "download") this.downloadCount += 1;

    this.accessLog.push({
        accessedBy,
        action,
        ipAddress,
        userAgent
    });
    return this.save();
};

// Pre-save middleware to ensure only one primary file
documentSchema.pre("save", function (next) {
    if (this.isModified("files")) {
        const primaryFiles = this.files.filter(file => file.isPrimary);
        if (primaryFiles.length > 1) {
            // Keep the first one as primary, mark others as not primary
            for (let i = 1; i < primaryFiles.length; i++) {
                primaryFiles[i].isPrimary = false;
            }
        }
    }
    next();
});

const Document = mongoose.model("Document", documentSchema);

export default Document;