import mongoose from "mongoose";

const tempFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['temp', 'uploaded', 'failed'],
        default: 'temp'
    },
    s3FileName: {
        type: String,
        required: true
    },
    addedDate: {
        type: Date,
        default: Date.now,
        index: { expires: '2h' } // Automatically remove documents after 2 hours
    },
    fileType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    }
});

// Create index for cleanup job
tempFileSchema.index({ status: 1, addedDate: 1 });

const TempFile = mongoose.model('TempFile', tempFileSchema);
export default TempFile;