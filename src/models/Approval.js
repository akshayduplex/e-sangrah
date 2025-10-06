// models/Approval.js
import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true
    },
    designation: { type: String },
    approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "In Review"],
        default: "Pending"
    },
    remark: {
        type: String,
        trim: true,
        maxlength: 500
    },
    approvedOn: {
        type: Date
    },
    dueDate: {
        type: Date
    }
}, { timestamps: true });

// Index for efficient queries
approvalSchema.index({ document: 1, level: 1 });
approvalSchema.index({ approver: 1, status: 1 });

const Approval = mongoose.model("Approval", approvalSchema);
export default Approval;