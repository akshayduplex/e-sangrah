// models/DocumentVersion.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const documentVersionSchema = new Schema({
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    versionNumber: { type: Number, required: true },       // sequential integer (1,2,3...)
    versionLabel: { type: String, required: true },       // "1.0", "1.1", "2.0"
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    changeReason: { type: String, trim: true },
    snapshot: { type: Schema.Types.Mixed },                // snapshot of the document state (no binary file bytes)
    files: [{ type: Schema.Types.ObjectId, ref: "File" }], // file references for this version
    isDraft: { type: Boolean, default: false }            // mark draft versions if you support check-in/out
}, { timestamps: false });

// quick latest index
documentVersionSchema.index({ documentId: 1, versionNumber: -1 });

export default mongoose.model("DocumentVersion", documentVersionSchema);
