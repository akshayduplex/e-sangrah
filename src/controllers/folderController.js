// controllers/folderController.js
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import mongoose from 'mongoose';
import { generateUniqueFileName } from '../helper/GenerateUniquename.js';
import { putObject } from '../utils/s3Helpers.js';
import logger from '../utils/logger.js';
import TempFile from '../models/TempFile.js';

//Page controlers

// Folder list by ID
export const showFolderListById = async (req, res) => {
    try {
        const { folderId } = req.params;
        res.render("pages/document/documentFolderList", {
            title: "E-Sangrah - Documents-List",
            user: req.user,
            folderId
        });
    } catch (err) {
        logger.error("Error loading document list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load documents",
        });
    }
};

// Upload Folder page
export const showUploadFolderPage = (req, res) => {
    res.render("pages/folders/upload-folder", {
        title: "E-Sangrah - Upload-Folder",
        user: req.user
    });
};

// Archived Folders page
export const showArchivedFoldersPage = (req, res) => {
    res.render("pages/folders/archivedFolders", {
        title: "E-Sangrah - ArchivedFolders",
        user: req.user
    });
};

// Recycle-bin Folders page
export const showRecycleBinPage = async (req, res) => {
    try {
        const documents = await Document.find({ isDeleted: true })
            .select("department deletedAt tag createdAt files")
            .populate("department", "name")
            .populate("files", "originalName fileSize");

        return res.render('pages/folders/recycleBin', { documents, user: req.user });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Failed to load recycle bin documents.");
    }
};

// Main Folders page
export const showMainFoldersPage = (req, res) => {
    res.render("pages/folders/folders", {
        title: "E-Sangrah - Folders",
        user: req.user
    });
};

//API controllers

// Create folder
export const createFolder = async (req, res) => {
    try {
        const { name, parentId, projectId, departmentId } = req.body;
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
        const folder = new Folder({
            owner: ownerId,
            parent: parentId || null,
            name,
            projectId: projectId || null,
            departmentId: departmentId || null,
            createdBy: ownerId,
            updatedBy: ownerId
        });
        await folder.save();

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
        logger.error('Create folder error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating folder'
        });
    }
};

// List all folders for a user (ignoring parent)
export const getAllFolders = async (req, res) => {
    try {
        const { departmentId, projectId } = req.query;

        const filter = { status: "active", deletedAt: null };

        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            filter.departmentId = departmentId;
        }

        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            filter.projectId = projectId;
        }

        const folders = await Folder.find(filter)
            .select("_id name slug size path createdAt updatedAt departmentId projectId")
            .populate("departmentId", "name") // department name
            .populate("projectId", "projectName") // project name
            .sort({ name: 1 })
            .lean();

        return res.json({
            success: true,
            message: "Folders retrieved successfully",
            folders
        });
    } catch (error) {
        logger.error("Error fetching folders:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve folders",
            error: error.message
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
        }).select('name slug path createdAt updatedAt size projectId departmentId').sort({ name: 1 })
            .populate('projectId', 'name')
            .populate('departmentId', 'name');;

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
        logger.error('List folders error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching folders'
        });
    }
};

export const getFoldersProjectDepartment = async (req, res) => {
    try {
        const { departmentId } = req.params;
        const { projectId } = req.query;

        const filter = { status: "active", deletedAt: null };

        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            filter.departmentId = departmentId;
        }

        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            filter.projectId = projectId;
        }

        const folders = await Folder.find(filter)
            .select("_id name") // only id and name
            .sort({ name: 1 })  // optional: alphabetical
            .lean();

        return successResponse(res, { folders }, "Folders retrieved successfully");
    } catch (error) {
        logger.error("Error fetching folders:", error);
        return errorResponse(res, error, "Failed to retrieve folders");
    }
};

// Get folder details with contents
export const getFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;

        const folder = await Folder.findOne({ _id: id, owner: ownerId, isDeleted: false })
            .populate('parent', 'name path')
            .populate('owner', 'name email')
            .populate('projectId', 'name')
            .populate('departmentId', 'name');

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
        }).select('name slug path createdAt updatedAt size projectId departmentId').populate('projectId', 'name').populate('departmentId', 'name').sort({ name: 1 });

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
        logger.error('Get folder error:', err);
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
        logger.error('Rename folder error:', err);
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
        const isCircular = await Folder.isDescendant(newParentId, folder._id);
        if (isCircular) throw new Error("Cannot move folder into its own subfolder");

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
        logger.error('Move folder error:', err);
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
        const ownerId = req.user._id; // assuming req.user is populated

        // Find the folder
        const folder = await Folder.findOne({ _id: id, owner: ownerId });
        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        // Check if folder is empty
        const fileCount = folder.files?.length || 0;
        const subfolderCount = await Folder.countDocuments({ parent: id, owner: ownerId, isDeleted: false });

        if (fileCount > 0 || subfolderCount > 0) {
            // Folder is not empty → cannot delete
            return res.status(400).json({
                success: false,
                message: "Folder is not empty. Delete files/subfolders first."
            });
        }

        // Folder is empty → permanently delete
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
                size: buffer.length
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
        logger.error("Upload to folder error:", err);
        res.status(500).json({ success: false, message: "File upload failed" });
    }
};

// Get folder tree structure
// export const getFolderTree = async (req, res) => {
//     try {
//         const { rootId, departmentId, projectId } = req.query;

//         const buildTree = async (parentId = null) => {
//             // Build query dynamically
//             const query = { parent: parentId, status: "active", isArchived: false };

//             if (departmentId && departmentId !== 'all') query.departmentId = departmentId;
//             if (projectId && projectId !== 'all') query.projectId = projectId;

//             const folders = await Folder.find(query)
//                 // .select('name slug path createdAt updatedAt projectId departmentId files')
//                 .populate('projectId', 'name')
//                 .populate('departmentId', 'name')
//                 .sort({ name: 1 });

//             const tree = await Promise.all(folders.map(async (folder) => {
//                 const children = await buildTree(folder._id);
//                 return {
//                     _id: folder._id,
//                     name: folder.name,
//                     slug: folder.slug,
//                     path: folder.path,
//                     projectId: folder.projectId,
//                     departmentId: folder.departmentId,
//                     children: children.length > 0 ? children : null
//                 };
//             }));

//             return tree;
//         };

//         const tree = rootId ? await buildTree(rootId) : await buildTree();

//         res.json({
//             success: true,
//             tree
//         });
//     } catch (err) {
//         logger.error('Get folder tree error:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Server error while fetching folder tree'
//         });
//     }
// };

// Get folder tree structure including files with selected fields
export const getFolderTree = async (req, res) => {
    try {
        const { rootId, departmentId, projectId } = req.query;

        const buildTree = async (parentId = null) => {
            // Build query dynamically
            const query = { parent: parentId, status: "active", isArchived: false };

            if (departmentId && departmentId !== 'all') query.departmentId = departmentId;
            if (projectId && projectId !== 'all') query.projectId = projectId;

            const folders = await Folder.find(query)
                .populate('projectId', 'name')
                .populate('departmentId', 'name')
                .sort({ name: 1 })
                .lean();

            const tree = await Promise.all(folders.map(async (folder) => {
                const children = await buildTree(folder._id);

                // Map files to only include the desired fields
                const files = (folder.files || []).map(f => ({
                    _id: f._id,
                    file: f.file,
                    originalName: f.originalName,
                    fileType: f.fileType,
                    size: f.size
                }));

                return {
                    _id: folder._id,
                    name: folder.name,
                    slug: folder.slug,
                    path: folder.path,
                    projectId: folder.projectId,
                    departmentId: folder.departmentId,
                    files,
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
        logger.error('Get folder tree error:', err);
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
        logger.error("Archive folder error:", err);
        res.status(500).json({ success: false, message: "Server error while archiving folder" });
    }
};
export const getArchivedFolders = async (req, res) => {
    try {
        const ownerId = req.user._id;

        // Find all folders that are archived and not deleted
        const folders = await Folder.find({ owner: ownerId, isArchived: true, deletedAt: null })
            .sort({ updatedAt: -1 }).select('name owner departmentId parent status createdBy updatedBy slug').populate('departmentId', 'name').populate('parent', 'name').populate('createdBy', 'name').populate('updatedBy', 'name').populate('owner', 'name email').populate('projectId', 'projectName')
            .lean();

        res.json({
            success: true,
            folders
        });
    } catch (err) {
        logger.error("Error fetching archived folders:", err);
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
        logger.error(err);
        res.status(500).json({ success: false, message: "Server error while restoring folder" });
    }
};