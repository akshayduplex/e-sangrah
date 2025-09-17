import mongoose from "mongoose";

const tempFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    s3Filename: {
        type: String,
        required: true,
        unique: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["temp", "permanent", "deleted"],
        default: "temp",
    },
    addDate: {
        type: Date,
        default: Date.now,
    },
});

const TempFile = mongoose.model("TempFile", tempFileSchema);

export default TempFile;
