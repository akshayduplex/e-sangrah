// models/File.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: false },
    file: { type: String, required: true }, // S3 key
    s3Url: { type: String },
    originalName: { type: String, required: true },
    version: { type: Number, default: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileType: { type: String, required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    uploadedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    fileSize: { type: Number, default: 0 },
    hash: { type: String }
}, { timestamps: true });


// Indexes
fileSchema.index({ folder: 1, uploadedAt: -1 });
fileSchema.index({ document: 1, version: -1, status: 1 });

const File = mongoose.model("File", fileSchema);
export default File;
