// models/DocumentVersion.js (immutable historical snapshots)
import mongoose from "mongoose";
const { Schema } = mongoose;

const documentVersionSchema = new Schema({
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    versionNumber: { type: Number, required: true },           // incremental integer
    versionLabel: { type: String, default: null },            // "1.0", "1.1", or semantic label
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },   // who made this version
    changeReason: { type: String },
    // store snapshot of the document fields you want (avoid embedding huge binary)
    snapshot: { type: Schema.Types.Mixed },                   // JSON snapshot of the document state (excluding large binary files)
    files: [{ type: Schema.Types.ObjectId, ref: "File" }],    // file references (not the file bytes)
    // optional: store compressed diff instead of whole snapshot
}, { timestamps: false });

documentVersionSchema.index({ documentId: 1, versionNumber: -1 }); // for quick latest
export default mongoose.model("DocumentVersion", documentVersionSchema);