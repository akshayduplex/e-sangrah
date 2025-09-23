// controllers/folderController.js
import Folder from '../../models/Folder.js';
import Document from '../../models/Document.js';
import TempFile from '../../models/TempFile.js';
import mongoose from 'mongoose';
import { generateUniqueFileName } from '../../helper/generateUniquename.js';
import { putObject } from '../../utils/s3Helpers.js';

// Helper function to generate folder path
const generatePath = async (folderId) => {
    const pathParts = [];
    let currentId = folderId;

    while (currentId) {
        const folder = await Folder.findById(currentId);
        if (!folder) break;
        pathParts.unshift(folder.slug || folder.name.toLowerCase().replace(/\s+/g, '-'));
        currentId = folder.parent;
    }

    return '/' + pathParts.join('/');
};

// Create folder
export const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const ownerId = req.user._id;

        // Check if folder with same name already exists in the same location
        const existingFolder = await Folder.findOne({
            name,
            parent: parentId || null,
            owner: ownerId,
            isDeleted: false
        });

        if (existingFolder) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists in this location'
            });
        }

        // Use the static method to create folder with unique slug
        const folder = await Folder.createFolder(ownerId, parentId, name, ownerId);

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            folder: {
                _id: folder._id,
                name: folder.name,
                slug: folder.slug,
                parent: folder.parent,
                path: folder.path,
                owner: folder.owner,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt
            }
        });
    } catch (err) {
        console.error('Create folder error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating folder'
        });
    }
};

// List all folders for a user (ignoring parent)
export const getAllFolders = async (req, res) => {
    try {
        const ownerId = req.user._id;

        const folders = await Folder.find({
            owner: ownerId,
            deletedAt: null,  // or isDeleted: false if you add that field
            isArchived: false
        }).populate('parent')
            .select('name slug path parent createdAt updatedAt size depth')
            .sort({ path: 1 }); // order by hierarchy path

        res.json({
            success: true,
            folders
        });
    } catch (err) {
        console.error('Get all folders error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching all folders'
        });
    }
};


// List folders with optional content (files/documents)
export const listFolders = async (req, res) => {
    try {
        const parentId = req.query.parentId || null;
        const ownerId = req.user._id;
        const { includeContent } = req.query;

        const folders = await Folder.find({
            parent: parentId,
            owner: ownerId,
            isDeleted: false
        }).select('name slug path createdAt updatedAt size').sort({ name: 1 });

        let content = [];

        // If includeContent is requested, fetch documents/files in this folder
        if (includeContent === 'true') {
            content = await Document.find({
                folder: parentId,
                owner: ownerId,
                isDeleted: false
            }).select('name description status files createdAt updatedAt metadata')
                .populate('department', 'name')
                .populate('project', 'name')
                .sort({ createdAt: -1 });
        }

        res.json({
            success: true,
            folders,
            content
        });
    } catch (err) {
        console.error('List folders error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching folders'
        });
    }
};

// Get folder details with contents
export const getFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false })
            .populate('parent', 'name path')
            .populate('owner', 'name email');

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Get subfolders
        const subfolders = await Folder.find({
            parent: id,
            owner: ownerId,
            isDeleted: false
        }).select('name slug path createdAt updatedAt size').sort({ name: 1 });

        // Get documents/files in this folder
        const documents = await Document.find({
            folder: id,
            owner: ownerId,
            isDeleted: false
        }).select('name description status files createdAt updatedAt metadata compliance')
            .populate('department', 'name')
            .populate('project', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            folder,
            subfolders,
            documents
        });
    } catch (err) {
        console.error('Get folder error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching folder details'
        });
    }
};

// Rename folder
export const renameFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const ownerId = req.user._id;

        // Find the folder that is not deleted
        const folder = await Folder.findOne({ _id: id, owner: ownerId, deletedAt: null });
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Check for duplicate name in the same parent
        const existingFolder = await Folder.findOne({
            name,
            parent: folder.parent,
            owner: ownerId,
            deletedAt: null,
            _id: { $ne: id }
        });

        if (existingFolder) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists in this location'
            });
        }

        // Rename
        folder.name = name;
        folder.updatedBy = ownerId;
        await folder.save(); // updatedAt auto-updated

        res.json({
            success: true,
            message: 'Folder renamed successfully',
            folder: {
                _id: folder._id,
                name: folder.name,
                slug: folder.slug,
                path: folder.path
            }
        });
    } catch (err) {
        console.error('Rename folder error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while renaming folder'
        });
    }
};

// Move folder
export const moveFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { newParentId } = req.body;
        const ownerId = req.user._id;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Use the static method to move folder (handles path updates recursively)
        const updatedFolder = await Folder.moveFolder(id, newParentId, ownerId);

        res.json({
            success: true,
            message: 'Folder moved successfully',
            folder: {
                _id: updatedFolder._id,
                name: updatedFolder.name,
                parent: updatedFolder.parent,
                path: updatedFolder.path
            }
        });
    } catch (err) {
        console.error('Move folder error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error while moving folder'
        });
    }
};

// Delete folder (soft delete)
export const deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id; // assuming you have req.user

        // Find the folder
        const folder = await Folder.findOne({ _id: id, owner: ownerId });
        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        // Check if the folder has any files
        const fileCount = await TempFile.countDocuments({ folder: id, status: { $ne: "deleted" } });

        if (fileCount > 0) {
            // Folder has files → mark as inactive
            folder.isDeleted = true; // or folder.status = "inactive" if you have a status field
            await folder.save();
            return res.json({ success: true, message: "Folder contains files, marked as inactive" });
        }

        // No files → delete permanently
        await Folder.deleteOne({ _id: id, owner: ownerId });
        return res.json({ success: true, message: "Folder permanently deleted" });
    } catch (err) {
        console.error("Error deleting folder:", err);
        res.status(500).json({ success: false, message: err.message || "Server error while deleting folder" });
    }
};

// Upload files to folder
export const uploadToFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const ownerId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: "Invalid folder ID" });
        }

        const folder = await Folder.findOne({ _id: folderId, owner: ownerId });
        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            const { originalname, mimetype, buffer } = file;
            const s3Filename = generateUniqueFileName(originalname);

            // Upload to S3 under the folder name
            const { url, key } = await putObject(buffer, s3Filename, mimetype, folder.name);

            // Save as TempFile
            const tempFile = await TempFile.create({
                fileName: originalname,
                originalName: originalname,
                s3Filename: key,
                s3Url: url,
                fileType: mimetype,
                folder: folder._id, // still link to folder in DB
                status: "permanent",
                size: buffer.length
            });

            uploadedFiles.push({
                fileId: tempFile._id,
                originalName: originalname,
                s3Filename: key,
                s3Url: url,
            });
        }

        // Update folder size
        const totalSize = uploadedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
        folder.size += totalSize;
        await folder.save();

        res.status(201).json({
            success: true,
            message: "Files uploaded successfully",
            folderId: folder._id,
            files: uploadedFiles,
        });
    } catch (err) {
        console.error("Upload to folder error:", err);
        res.status(500).json({ success: false, message: "File upload failed" });
    }
};

// Get folder tree structure
export const getFolderTree = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const { rootId } = req.query;

        const buildTree = async (parentId = null) => {
            const folders = await Folder.find({
                parent: parentId,
                owner: ownerId,
                isDeleted: false
            }).select('name slug path createdAt updatedAt').sort({ name: 1 });

            const tree = await Promise.all(folders.map(async (folder) => {
                const children = await buildTree(folder._id);
                return {
                    _id: folder._id,
                    name: folder.name,
                    slug: folder.slug,
                    path: folder.path,
                    children: children.length > 0 ? children : null
                };
            }));

            return tree;
        };

        const tree = rootId ? await buildTree(rootId) : await buildTree();

        res.json({
            success: true,
            tree
        });
    } catch (err) {
        console.error('Get folder tree error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching folder tree'
        });
    }
};

export const archiveFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, deletedAt: null });
        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        folder.isArchived = true; // or folder.status = "archived"
        folder.updatedBy = ownerId;
        await folder.save();

        res.json({
            success: true,
            message: "Folder archived successfully",
            folder: {
                _id: folder._id,
                name: folder.name,
                path: folder.path,
                isArchived: folder.isArchived
            }
        });
    } catch (err) {
        console.error("Archive folder error:", err);
        res.status(500).json({ success: false, message: "Server error while archiving folder" });
    }
};
export const getArchivedFolders = async (req, res) => {
    try {
        const ownerId = req.user._id;

        // Find all folders that are archived and not deleted
        const folders = await Folder.find({ owner: ownerId, isArchived: true, deletedAt: null })
            .sort({ updatedAt: -1 }).select('name slug')
            .lean();

        res.json({
            success: true,
            folders
        });
    } catch (err) {
        console.error("Error fetching archived folders:", err);
        res.status(500).json({ success: false, message: "Server error while fetching archived folders" });
    }
};

export const restoreFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;

        const folder = await Folder.findOne({ _id: id, owner: ownerId });
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        folder.isArchived = false; // restore
        folder.updatedBy = ownerId;
        await folder.save();

        res.json({ success: true, message: "Folder restored successfully", folder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error while restoring folder" });
    }
};