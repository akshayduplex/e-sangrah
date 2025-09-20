// controllers/folderController.js
import Folder from '../../models/Folder.js';
import Document from '../../models/Document.js';
import TempFile from '../../models/TempFile.js';

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

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Check if new name already exists in the same location
        const existingFolder = await Folder.findOne({
            name,
            parent: folder.parent,
            owner: ownerId,
            isDeleted: false,
            _id: { $ne: id }
        });

        if (existingFolder) {
            return res.status(400).json({
                success: false,
                message: 'A folder with this name already exists in this location'
            });
        }

        folder.name = name;
        folder.updatedAt = Date.now();
        folder.updatedBy = ownerId;
        await folder.save();

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
        const ownerId = req.user._id;
        const { cascade } = req.query;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Use the static method to soft delete (optionally cascade)
        await Folder.markDeleted(id, cascade === 'true', ownerId);

        res.json({
            success: true,
            message: `Folder ${cascade === 'true' ? 'and its contents' : ''} deleted successfully`
        });
    } catch (err) {
        console.error('Delete folder error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error while deleting folder'
        });
    }
};

// Upload files to folder
export const uploadToFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;
        const { tempFileIds, documentData } = req.body;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Get temp files
        const tempFiles = await TempFile.find({
            _id: { $in: tempFileIds },
            status: 'temp'
        });

        if (tempFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid temporary files found'
            });
        }

        // Create document with files
        const document = new Document({
            ...documentData,
            status: "Pending",
            folder: id,
            owner: ownerId,
            files: tempFiles.map(tempFile => ({
                file: tempFile.s3Filename,
                originalName: tempFile.originalName,
                version: 1,
                uploadedAt: new Date(),
                isPrimary: false
            }))
        });

        // Set first file as primary
        if (document.files.length > 0) {
            document.files[0].isPrimary = true;
        }

        await document.save();

        // Update temp files status to permanent
        await TempFile.updateMany(
            { _id: { $in: tempFileIds } },
            { status: 'permanent' }
        );

        // Update folder size (optional - you might want to calculate this differently)
        folder.size += tempFiles.reduce((total, file) => total + (file.size || 0), 0);
        await folder.save();

        res.status(201).json({
            success: true,
            message: 'Files uploaded to folder successfully',
            document
        });
    } catch (err) {
        console.error('Upload to folder error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading files to folder'
        });
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