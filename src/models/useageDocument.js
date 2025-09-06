const mongoose = require("mongoose");

const usageTrackingSchema = new mongoose.Schema({
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    storage: {
        total: {
            type: Number,
            default: 0
        },
        used: {
            type: Number,
            default: 0
        },
        documents: {
            type: Number,
            default: 0
        }
    },
    activity: {
        uploads: {
            type: Number,
            default: 0
        },
        downloads: {
            type: Number,
            default: 0
        },
        views: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        }
    },
    users: {
        total: {
            type: Number,
            default: 0
        },
        active: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
usageTrackingSchema.index({ department: 1, date: 1 });

// Virtual for storage usage percentage
usageTrackingSchema.virtual("storageUsagePercentage").get(function () {
    if (this.storage.total === 0) return 0;
    return (this.storage.used / this.storage.total) * 100;
});

// Static method to get latest usage for department
usageTrackingSchema.statics.getLatestUsage = function (departmentId) {
    return this.findOne({ department: departmentId })
        .sort({ date: -1 })
        .limit(1);
};

// Static method to get usage history for department
usageTrackingSchema.statics.getUsageHistory = function (departmentId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.find({
        department: departmentId,
        date: { $gte: startDate }
    }).sort({ date: 1 });
};

module.exports = mongoose.model("UsageTracking", usageTrackingSchema);