import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    code: {
        type: String,
        required: true,
        uppercase: true,
        unique: true,
        maxlength: 20
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    manager: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    teamMembers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        role: {
            type: String,
            trim: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }],
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Planning", "Active", "OnHold", "Completed", "Cancelled"],
        default: "Planning"
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium"
    },
    budget: {
        allocated: {
            type: Number,
            default: 0
        },
        spent: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: "USD"
        }
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    settings: {
        allowExternalSharing: {
            type: Boolean,
            default: false
        },
        autoApproveDocuments: {
            type: Boolean,
            default: false
        },
        retentionPolicy: {
            type: Number, // in days
            default: 365
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
projectSchema.index({ name: 1 });
projectSchema.index({ code: 1 }, { unique: true });
projectSchema.index({ department: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ isActive: 1 });

// Virtual for project duration in days
projectSchema.virtual("duration").get(function () {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for project progress (to be calculated based on documents/milestones)
projectSchema.virtual("progress").get(function () {
    return 0; // Placeholder - would calculate based on completed tasks
});

// Virtual for overdue status
projectSchema.virtual("isOverdue").get(function () {
    return this.endDate < new Date() && this.status !== "Completed";
});

// Method to check if user is team member
projectSchema.methods.isTeamMember = function (userId) {
    return this.teamMembers.some(member =>
        member.user.toString() === userId.toString()
    );
};

// Method to check if user can manage project
projectSchema.methods.canManage = function (userId) {
    return this.manager.some(m => m.toString() === userId.toString());
};

const Project = mongoose.model("Project", projectSchema);
export default Project;
