const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    extension: {
        type: String,
        required: true,
        lowercase: true
    },
    gridfsId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    storagePath: {
        type: String,
        default: null
    },
    checksum: {
        type: String,
        default: null
    },
    virusScanStatus: {
        type: String,
        enum: ["pending", "clean", "infected", "error"],
        default: "pending"
    },
    virusScanDate: {
        type: Date,
        default: null
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    accessKey: {
        type: String,
        default: null
    },
    thumbnail: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes for better performance
fileSchema.index({ filename: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ uploadDate: 1 });
fileSchema.index({ mimetype: 1 });
fileSchema.index({ gridfsId: 1 }, { unique: true });
fileSchema.index({ virusScanStatus: 1 });

// Virtual for formatted size
fileSchema.virtual("formattedSize").get(function () {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (this.size === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(this.size) / Math.log(1024)));
    return Math.round(this.size / Math.pow(1024, i), 2) + ' ' + sizes[i];
});

// Method to check if file is an image
fileSchema.methods.isImage = function () {
    return this.mimetype.startsWith('image/');
};

// Method to check if file is a document
fileSchema.methods.isDocument = function () {
    const documentTypes = [
        'application/pdf',
        'application/',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];
    return documentTypes.includes(this.mimetype);
};

module.exports = mongoose.model("File", fileSchema);