import mongoose from "mongoose";
const { Decimal128 } = mongoose.Schema.Types;
const documentSchema = new mongoose.Schema({
    description: { type: String, trim: true, maxlength: 1000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    documentDonor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    documentVendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["Draft", "Pending", "Approved", "Rejected"], default: "Draft" },
    tags: [{ type: String, lowercase: true, trim: true }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isArchived: {
        type: Boolean,
        default: false
    },
    metadata: {
        fileName: { type: String, trim: true },
        fileDescription: { type: String, trim: true },
        mainHeading: { type: String, trim: true }
    },
    compliance: {
        isCompliance: { type: Boolean, default: false },
        expiryDate: { type: Date, default: null },
        retentionPeriod: { type: Number, default: null },
        complianceType: { type: String, trim: true }
    },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File", default: null }],
    // currentVersion: { type: Number, default: 1 },
    documentDate: { type: Date, default: Date.now },

    signature: {
        fileName: { type: String, trim: true },
        fileUrl: { type: String, trim: true }
    },
    link: { type: String },
    approvalHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Approval"
    }],
    // Flattened sharedWith for safe indexing
    sharedWithUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comment: { type: String, trim: true, maxlength: 1000 },

    versioning: {
        currentVersion: { type: Decimal128, default: mongoose.Types.Decimal128.fromString("1.0") },
        previousVersion: { type: Decimal128, default: null },
        nextVersion: { type: Decimal128, default: null },
        firstVersion: { type: Decimal128, default: mongoose.Types.Decimal128.fromString("1.0") },
    },
    versionHistory: [{
        version: { type: Decimal128, required: true, default: mongoose.Types.Decimal128.fromString("1.0") },
        timestamp: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changes: { type: String },
        file: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
        snapshot: { type: mongoose.Schema.Types.Mixed }
    }],
}, { timestamps: true });

/** -------------------- INDEXES -------------------- **/
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ owner: 1 });
documentSchema.index({ createdAt: 1 });
documentSchema.index({ "compliance.expiryDate": 1 });
documentSchema.index({ tags: 1 });

/** -------------------- VIRTUAL -------------------- **/
documentSchema.virtual("isExpired").get(function () {
    return this.compliance.expiryDate ? this.compliance.expiryDate < new Date() : false;
});


const Document = mongoose.model("Document", documentSchema);
export default Document;