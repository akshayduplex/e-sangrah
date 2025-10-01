import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    file: { type: String, required: true },
    s3Url: { type: String },
    originalName: { type: String, required: true },
    version: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    hash: { type: String }
}, { _id: true });

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
    documentDate: { type: Date, default: Date.now },

    signature: {
        fileName: { type: String, trim: true },
        fileUrl: { type: String, trim: true }
    },
    link: { type: String },

    // Flattened sharedWith for safe indexing
    sharedWithUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Keep original sharedWith if needed for accessLevel tracking
    sharedWith: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        accessLevel: { type: String, enum: ["view", "edit"], default: "view" },
        canDownload: { type: Boolean, default: false },
        sharedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null },
        inviteStatus: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
    }],
    comment: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

/** -------------------- INDEXES -------------------- **/
documentSchema.index({ status: 1 });
documentSchema.index({ department: 1 });
documentSchema.index({ owner: 1 });
documentSchema.index({ createdAt: 1 });
documentSchema.index({ "compliance.expiryDate": 1 });
documentSchema.index({ "files.isPrimary": 1 });
documentSchema.index({ "files.version": -1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ sharedWithUsers: 1 });

documentSchema.index({ "files.isPrimary": 1, "files.status": 1 });

/** -------------------- VIRTUAL -------------------- **/
documentSchema.virtual("isExpired").get(function () {
    return this.compliance.expiryDate ? this.compliance.expiryDate < new Date() : false;
});

/** -------------------- PRE-SAVE -------------------- **/
documentSchema.pre("save", function (next) {
    if (this.isModified("files")) {
        const activePrimary = this.files.filter(f => f.isPrimary && f.status === "active");
        if (activePrimary.length > 1) {
            for (let i = 1; i < activePrimary.length; i++) activePrimary[i].isPrimary = false;
        }
    }
    next();
});

/** -------------------- METHODS -------------------- **/
documentSchema.methods.addNewVersion = async function (fileData, userId) {
    const newVersion = this.currentVersion + 1;
    this.files.forEach(f => { if (f.status === "active") f.isPrimary = false; });
    this.files.push({
        ...fileData,
        version: newVersion,
        uploadedBy: userId,
        uploadedAt: new Date(),
        isPrimary: true,
        status: "active"
    });
    this.currentVersion = newVersion;
    await this.save();
    return this;
};

documentSchema.methods.archiveVersion = async function (versionNumber) {
    const file = this.files.find(f => f.version === versionNumber);
    if (file) {
        file.status = "archived";
        if (file.isPrimary) {
            file.isPrimary = false;
            const prevActive = this.files.filter(f => f.version < versionNumber && f.status === "active")
                .sort((a, b) => b.version - a.version)[0];
            if (prevActive) prevActive.isPrimary = true;
        }
        await this.save();
    }
    return this;
};

const Document = mongoose.model("Document", documentSchema);
export default Document;