import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const projectSchema = new mongoose.Schema(
    {
        projectName: { type: String, required: true, trim: true, maxlength: 200, index: true },
        projectCode: { type: String, required: true, uppercase: true, unique: true, maxlength: 20, index: true },
        projectType: { type: String, trim: true, maxlength: 100 },
        projectDescription: { type: String, trim: true, maxlength: 1000 },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        donor: [{ name: String, donor_id: mongoose.Schema.Types.ObjectId }],
        vendor: [{ name: String, donor_id: mongoose.Schema.Types.ObjectId }],
        projectStartDate: { type: Date, required: true, index: true },
        projectEndDate: { type: Date, required: true, index: true },
        projectStatus: { type: String, enum: ["Planned", "Active", "OnHold", "Completed", "Cancelled"], default: "Planned", index: true },
        projectDuration: { type: Number, default: 0 },
        priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
        tags: [{ type: String, lowercase: true, trim: true }],
        isActive: { type: Boolean, default: true, index: true }
    },
    { timestamps: true }
);

// Add pagination plugin
projectSchema.plugin(mongoosePaginate);

// Virtuals
projectSchema.virtual("duration").get(function () {
    if (!this.projectStartDate || !this.projectEndDate) return 0;
    return Math.ceil((this.projectEndDate - this.projectStartDate) / (1000 * 60 * 60 * 24));
});

projectSchema.virtual("isOverdue").get(function () {
    return this.projectEndDate < new Date() && this.projectStatus !== "Completed";
});

// Method to check if user is project manager
projectSchema.methods.canManage = function (userId) {
    return this.projectManager.toString() === userId.toString();
};

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
export default Project;
