// models/File.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    file: { type: String, required: true }, // path or s3 key
    s3Url: { type: String },
    originalName: { type: String, required: true },
    version: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "archived"], default: "active" },
    hash: { type: String }
}, { timestamps: true });

// Indexes
fileSchema.index({ document: 1, version: -1 });
fileSchema.index({ document: 1, isPrimary: 1 });
fileSchema.index({ document: 1, status: 1 });

const File = mongoose.model("File", fileSchema);
export default File;
