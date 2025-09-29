import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    file: { type: String, required: true }, // S3/GCS URL
    s3Url: { type: String }, // optional: full public URL
    originalName: { type: String, required: true },
    version: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    hash: { type: String } // optional: checksum
}, { _id: true });

const documentSchema = new mongoose.Schema({
    description: { type: String, trim: true, maxlength: 1000 },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["Draft", "Pending", "UnderReview", "Approved", "Rejected", "Archived"], default: "Draft" },
    tags: [{ type: String, lowercase: true, trim: true }],
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
    files: [fileSchema],
    currentVersion: { type: Number, default: 1 },
    signature: { fileName: String, fileUrl: String },
    link: { type: String },
    sharedWith: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessLevel: { type: String, enum: ["view", "edit"], default: "view" },
        sharedAt: { type: Date, default: Date.now }
    }],
    remark: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

// --- Indexes
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ owner: 1 });
documentSchema.index({ "sharedWith.user": 1 });
documentSchema.index({ createdAt: 1 });
documentSchema.index({ "compliance.expiryDate": 1 });
documentSchema.index({ "files.isPrimary": 1 });
documentSchema.index({ "files.version": -1 });

// --- Virtual
documentSchema.virtual("isExpired").get(function () {
    return this.compliance.expiryDate ? this.compliance.expiryDate < new Date() : false;
});

// --- Pre-save: ensure only one primary active file
documentSchema.pre("save", function (next) {
    if (this.isModified("files")) {
        const activePrimaryFiles = this.files.filter(f => f.isPrimary && f.status === "active");
        if (activePrimaryFiles.length > 1) {
            for (let i = 1; i < activePrimaryFiles.length; i++) activePrimaryFiles[i].isPrimary = false;
        }
    }
    next();
});

// --- Add new version method
documentSchema.methods.addNewVersion = async function (fileData, userId) {
    const newVersionNumber = this.currentVersion + 1;

    // Deactivate old primary
    this.files.forEach(f => { if (f.status === "active") f.isPrimary = false; });

    this.files.push({
        ...fileData,
        version: newVersionNumber,
        uploadedBy: userId,
        uploadedAt: new Date(),
        isPrimary: true,
        status: "active"
    });

    this.currentVersion = newVersionNumber;
    await this.save();
    return this;
};

// --- Archive version method
documentSchema.methods.archiveVersion = async function (versionNumber) {
    const file = this.files.find(f => f.version === versionNumber);
    if (file) {
        file.status = "archived";
        if (file.isPrimary) {
            file.isPrimary = false;
            const previousActive = this.files
                .filter(f => f.version < versionNumber && f.status === "active")
                .sort((a, b) => b.version - a.version)[0];
            if (previousActive) previousActive.isPrimary = true;
        }
        await this.save();
    }
    return this;
};

const Document = mongoose.model("Document", documentSchema);
export default Document;
