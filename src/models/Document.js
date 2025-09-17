import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    // Basic Info
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
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: null
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
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
    documentManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    documentDate: {
        type: Date,
        default: Date.now
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
    category: {
        type: String,
        trim: true
    },
    // Unified metadata
    metadata: {
        fileName: { type: String, trim: true },
        fileDescription: { type: String, trim: true },
        mainHeading: { type: String, trim: true },
        additional: { type: mongoose.Schema.Types.Mixed, default: {} } // arbitrary extra data
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
    signature: {
        fileName: { type: String },
        fileUrl: { type: String }
    },
    link: {
        type: String
    },
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
    },
    comment: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
documentSchema.index({ title: "text", description: "text", tags: "text" });
documentSchema.index({ status: 1, department: 1, owner: 1, "sharedWith.user": 1, "sharedWithDepartments.department": 1, tags: 1, "compliance.expiryDate": 1, createdAt: 1, updatedAt: 1 });

// Virtuals
documentSchema.virtual("isExpired").get(function () {
    return this.compliance.expiryDate ? this.compliance.expiryDate < new Date() : false;
});

// Methods
documentSchema.methods.hasAccess = function (userId, departmentId) {
    if (this.owner.toString() === userId.toString() || this.isPublic) return true;

    const userShared = this.sharedWith.find(share => share.user.toString() === userId.toString());
    if (userShared) return true;

    const departmentShared = this.sharedWithDepartments.find(share => share.department.toString() === departmentId.toString());
    if (departmentShared) return true;

    return false;
};

documentSchema.methods.getUserPermission = function (userId, departmentId) {
    if (this.owner.toString() === userId.toString()) return "edit";

    const userShared = this.sharedWith.find(share => share.user.toString() === userId.toString());
    if (userShared) return userShared.permission;

    const departmentShared = this.sharedWithDepartments.find(share => share.department.toString() === departmentId.toString());
    if (departmentShared) return departmentShared.permission;

    return null;
};

documentSchema.methods.addAuditLog = function (action, performedBy, details = {}) {
    this.auditLog.push({ action, performedBy, details });
    return this.save();
};

documentSchema.methods.addAccessLog = function (accessedBy, action, ipAddress, userAgent) {
    if (action === "view") this.viewCount += 1;
    if (action === "download") this.downloadCount += 1;

    this.accessLog.push({ accessedBy, action, ipAddress, userAgent });
    return this.save();
};

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
