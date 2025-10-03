import mongoose from "mongoose";

const sharedWithSchema = new mongoose.Schema({
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    accessLevel: { type: String, enum: ["view", "edit"], default: "view" },
    canDownload: { type: Boolean, default: false },
    sharedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    inviteStatus: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
}, { timestamps: true });

// Useful indexes
sharedWithSchema.index({ document: 1, user: 1 }, { unique: true }); // Prevent duplicate shares
sharedWithSchema.index({ user: 1 });
sharedWithSchema.index({ document: 1 });
sharedWithSchema.index({ expiresAt: 1 });

const SharedWith = mongoose.model("SharedWith", sharedWithSchema);
export default SharedWith;
