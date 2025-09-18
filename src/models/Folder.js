// models/Folder.js
import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    path: { type: String }, // e.g., '/root/documents/project1'
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    permissions: {
        type: Map,
        of: String,
        default: {} // e.g., {"userId": "read"}
    },
    deleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to update path automatically
folderSchema.pre('save', async function (next) {
    if (this.parent) {
        const parentFolder = await this.constructor.findById(this.parent);
        this.path = parentFolder.path + '/' + this.name;
    } else {
        this.path = '/' + this.name;
    }
    next();
});

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
