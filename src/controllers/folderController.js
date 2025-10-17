// controllers/folderController.js
import Folder from '../models/Folder.js';
import Document from '../models/Document.js';
import crypto from 'crypto'
import mongoose from 'mongoose';
import { generateUniqueFileName } from '../helper/GenerateUniquename.js';
import { getObjectUrl, putObject } from '../utils/s3Helpers.js';
import logger from '../utils/logger.js';
import TempFile from '../models/TempFile.js';
import User from '../models/User.js';
import { API_CONFIG } from '../config/ApiEndpoints.js';
import { sendEmail } from '../services/emailService.js';
import { folderSharedTemplate } from '../emailTemplates/folderSharedTemplate.js';
import File from '../models/File.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/S3Client.js';
import checkFolderAccess from '../utils/checkFolderAccess.js';

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
    const selectedProjectId = req.session.selectedProject || null;
    const selectedProjectName = req.session.selectedProjectName || ''
    res.render("pages/folders/upload-folder", {
        title: "E-Sangrah - Upload-Folder",
        user: req.user,
        selectedProjectId: selectedProjectId,
        selectedProjectName: selectedProjectName

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
export const showviewFoldersPage = async (req, res) => {
    const { folderId } = req.params;
    const { token } = req.query;

    try {
        const folder = await Folder.findById(folderId).lean();
        if (!folder) return res.status(404).send('Folder not found');

        const access = checkFolderAccess(folder, req);

        res.render('pages/folders/viewFolders', {
            folder,
            user: req.user,
            ...access
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

export const viewFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const formatFileSize = (bytes) => {
            if (!bytes) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        };

        const getFileType = (filename, mimeType) => {
            const ext = filename.split('.').pop().toLowerCase();
            const mime = mimeType || '';

            return {
                isPDF: ext === 'pdf' || mime.includes('pdf'),
                isWord: ['doc', 'docx'].includes(ext) || mime.includes('word'),
                isExcel: ['xls', 'xlsx'].includes(ext) || mime.includes('excel'),
                isPowerPoint: ['ppt', 'pptx'].includes(ext) || mime.includes('powerpoint'),
                isImage: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext),
                isText: ['txt', 'md', 'json', 'xml', 'html', 'csv'].includes(ext),
                extension: ext,
                mimeType: mime
            };
        };

        // Fetch file document from DB
        const file = await File.findById(fileId).lean();
        if (!file) {
            return res.render("pages/folders/viewFile", {
                file: null,
                documentTitle: "Document",
                user: req.user
            });
        }

        // Generate signed URL from S3 with proper headers
        const fileUrl = file.s3Url || await getObjectUrl(file.file, 3600);

        res.render("pages/folders/viewFile", {
            file: {
                ...file,
                formattedSize: formatFileSize(file.fileSize),
                fileUrl,
                fileType: getFileType(file.originalName, file.mimeType)
            },
            documentTitle: file.originalName,
            user: req.user
        });

    } catch (error) {
        console.error(error);
        res.render("pages/folders/viewFile", {
            file: null,
            documentTitle: "Document",
            user: req.user
        });
    }
};
//API controllers

// Create folder
export const createFolder = async (req, res) => {
    try {
        const { name, parentId, projectId, departmentId } = req.body;
        const ownerId = req.user._id;

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
            .populate("departmentId", "name")
            .populate("projectId", "projectName")
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
            .select("_id name")
            .sort({ name: 1 })
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
        const folder = await Folder.findOne({ _id: id, "deletedAt": null, status: "active" })
            .populate('parent', 'name path')
            .populate('owner', 'name email')
            .populate('projectId', 'name')
            .populate('departmentId', 'name')
            .populate('files');
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

        const folder = await Folder.findOne({ _id: id, owner: ownerId, deletedAt: null });
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

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
        const ownerId = req.user._id;
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
                folder: folder._id,
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


// Get folder tree structure including files with selected fields
export const getFolderTree = async (req, res) => {
    try {
        const { rootId, departmentId, projectId } = req.query;

        const buildTree = async (parentId = null) => {
            // Build query dynamically
            const query = { parent: parentId, isArchived: false };

            if (departmentId && departmentId !== 'all') query.departmentId = departmentId;
            if (projectId && projectId !== 'all') query.projectId = projectId;

            const folders = await Folder.find(query)
                .populate('projectId', 'name')
                .populate('departmentId', 'name')
                .populate('files')
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
                    size: f.fileSize
                }));

                return {
                    _id: folder._id,
                    name: folder.name,
                    status: folder.status,
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

        folder.isArchived = true;
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "updatedAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
        const departmentFilter = req.query.department || "all";

        // Build filter
        const filter = {
            owner: ownerId,
            isArchived: true,
            deletedAt: null,
            ...(departmentFilter !== "all" ? { departmentId: departmentFilter } : {})
        };

        // Search
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } }
            ];
        }

        const total = await Folder.countDocuments(filter);

        const folders = await Folder.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('departmentId', 'name')
            .populate('owner', 'name email')
            .populate('projectId', 'projectName')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .lean();

        res.json({
            success: true,
            folders,
            total,
            page,
            totalPages: Math.ceil(total / limit)
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

        folder.isArchived = false;
        folder.updatedBy = ownerId;
        await folder.save();

        res.json({ success: true, message: "Folder restored successfully", folder });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: "Server error while restoring folder" });
    }
};




/**
 * Get folder details for sharing
 * - List of users with access
 * - Shareable links
 */
export const getFolderShareInfo = async (req, res) => {
    const { folderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: 'Invalid folder ID' });
    }

    try {
        const folder = await Folder.findById(folderId)
            .populate('permissions.principal', 'name email') // populate user info
            .lean();

        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        const usersWithAccess = (folder.permissions || [])
            .filter(p => p.model === 'User')
            .map(p => ({
                id: p.principal?._id,
                name: p.principal?.name || "Unknown",
                email: p.principal?.email || "",
                canDownload: p.canDownload || false,
                access: p.access
            }));

        const shareLinks = folder.metadata?.shareLinks || [];

        res.json({
            success: true,
            folderId: folder._id,
            folderName: folder.name,
            usersWithAccess,
            shareLinks
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const shareFolder = async (req, res) => {
    const { folderId } = req.params;
    const { userId, access, shareLink, duration, expiresAt, customStart, customEnd } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: 'Invalid folder ID' });
    }
    if (!userId || !access) {
        return res.status(400).json({ error: 'User email and access level are required' });
    }

    try {
        const user = await User.findOne({ email: userId }).select('_id name');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        // Add/update permissions
        const existing = folder.permissions.find(
            p => String(p.principal) === String(user._id) && p.model === "User"
        );
        if (existing) {
            existing.access = access;
            existing.duration = duration;
            existing.expiresAt = expiresAt ? new Date(expiresAt) : null;
            existing.customStart = customStart ? new Date(customStart) : null;
            existing.customEnd = customEnd ? new Date(customEnd) : null;
        } else {
            folder.permissions.push({
                principal: user._id,
                model: "User",
                access,
                duration,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                customStart: customStart ? new Date(customStart) : null,
                customEnd: customEnd ? new Date(customEnd) : null
            });
        }

        await folder.save();

        // Send email
        const html = folderSharedTemplate({
            userName: user.name,
            senderName: req.user?.name,
            folderName: folder.name,
            access,
            folderLink: shareLink,
            expiresAt
        });

        await sendEmail({
            to: userId,
            subject: `Folder Shared with You: ${folder.name}`,
            html,
            fromName: "E-sangrah",
        });

        res.json({
            message: "Folder shared and invitation email sent successfully",
            folder,
            link: shareLink,
        });

    } catch (err) {
        console.error("Error sharing folder:", err);
        res.status(500).json({ error: "Server error" });
    }
};


/**
 * Remove a user's access
 */
export const unshareFolder = async (req, res) => {
    const { folderId } = req.params;
    const { userId } = req.body;

    try {
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        folder.permissions = folder.permissions.filter(
            p => !(String(p.principal) === userId && p.model === 'User')
        );

        await folder.save();
        res.json({ message: 'Access revoked successfully', folder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};


export const downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId).lean();
        if (!file) return res.status(404).send("File not found");

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: file.file,
            ResponseContentDisposition: `attachment; filename="${file.originalName}"`,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.redirect(url);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error generating download link");
    }
};

/**
 * Generate shareable link for a folder
 * POST /api/folders/:folderId/share
 * body: { access: 'viewer' | 'editor' }
 */
export const generateShareLink = async (req, res) => {
    const { folderId } = req.params;
    const { access } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: "Invalid folder ID" });
    }
    if (!access) {
        return res.status(400).json({ error: "Access level is required" });
    }

    try {
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ error: "Folder not found" });

        // Clean expired share links
        folder.metadata = folder.metadata || {};
        folder.metadata.shareLinks = folder.metadata.shareLinks || [];
        const now = new Date();
        folder.metadata.shareLinks = folder.metadata.shareLinks.filter(
            l => !l.expiresAt || new Date(l.expiresAt) > now
        );

        // Generate token
        const token = crypto.randomBytes(20).toString('hex');

        folder.metadata.shareLinks.push({
            token,
            access,
            createdAt: now,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        await folder.save();

        // Include access in URL
        const shareableUrl = `${API_CONFIG.baseUrl}/folders/${access}/${folder._id}?${token}`;

        res.json({ message: 'Shareable link generated', link: shareableUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Access folder via token
 * GET /api/folders/:folderId/:access/:token
 */
export const accessViaToken = async (req, res) => {
    const { folderId, access } = req.params;
    const { token } = req.query;
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: 'Invalid folder ID' });
    }

    try {
        const folder = await Folder.findById(folderId).lean();
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        const now = new Date();

        const link = folder.metadata?.shareLinks?.find(
            l => l.token === token && l.access === access && (!l.expiresAt || new Date(l.expiresAt) > now)
        );

        if (!link) return res.status(403).json({ error: 'Invalid or expired link' });

        res.json({
            success: true,
            folder,
            access: link.access,
        });

    } catch (err) {
        console.error('Error accessing folder via token:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Toggle or update permission for a folder.
 * @param req.params.id - Folder ID
 * @param req.body.principalId - User ID
 * @param req.body.canDownload - Boolean (optional)
 * @param req.body.access - Array of access strings: ['view','edit','owner'] (optional)
 */
export const updateFolderPermission = async (req, res) => {
    const { id } = req.params;
    const { principalId, canDownload, access, status } = req.body;
    const updatedBy = req.user?._id || null;
    try {
        const folder = await Folder.findById(id);
        if (!folder) return res.status(404).json({ message: 'Folder not found' });

        // Update folder status if provided
        if (status && ['active', 'inactive'].includes(status)) {
            folder.status = status;
        }

        // Find existing permission
        let permission = folder.permissions.find(p => String(p.principal) === String(principalId));

        if (permission) {
            // Update fields
            if (typeof canDownload === 'boolean') permission.canDownload = canDownload;
            if (access) permission.access = access;
        } else {
            permission = folder.permissions.create({
                principal: principalId,
                model: 'User',
                canDownload: canDownload || false,
                access: access || 'view'
            });
            folder.permissions.push(permission);
        }

        folder.updatedBy = updatedBy;
        await folder.save();

        // Retrieve the updated permission from saved document
        const updatedPermission = folder.permissions.find(p => String(p.principal) === String(principalId));

        return res.json({
            message: 'Permission updated successfully',
            permission: updatedPermission,
            folderStatus: folder.status
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};



// Request access to a folder
export const requestFolderAccess = async (req, res) => {
    try {
        const { folderId } = req.params;
        const user = req.user;

        if (!mongoose.Types.ObjectId.isValid(folderId))
            return res.status(400).json({ success: false, message: "Invalid folder ID" });

        const folder = await Folder.findById(folderId).populate("owner", "name email");
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        const owner = folder.owner;
        if (!owner?.email) return res.status(400).json({ success: false, message: "Owner email not found" });

        const baseUrl = API_CONFIG.baseUrl || "http://localhost:5000";
        const manageLink = `${baseUrl}/admin/folders/${folderId}/manage-access?userEmail=${user.email}`;

        await sendEmail({
            to: owner.email,
            subject: `Access Request for Folder: ${folder.name}`,
            html: `
                <p>${user.name} (${user.email}) requested access to folder <strong>${folder.name}</strong>.</p>
                <p><a href="${manageLink}" style="color:white;background:#007bff;padding:10px 20px;border-radius:5px;text-decoration:none;">
                    Grant Access
                </a></p>
            `
        });

        res.json({ success: true, message: `Access request notification sent to ${owner.name || owner.email}.` });
    } catch (err) {
        console.error("requestFolderAccess error:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};
export const getFolderAccess = async (req, res) => {
    try {
        const { folderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(folderId))
            return res.status(400).json({ success: false, message: "Invalid folder ID" });

        const folder = await Folder.findById(folderId)
            .populate('permissions.principal', 'name email')
            .lean();

        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        const accessList = folder.permissions.map(p => ({
            userId: p.principal._id,
            name: p.principal.name,
            email: p.principal.email,
            access: p.access,
            expiresAt: p.expiresAt
        }));

        res.json({ success: true, accessList });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// Approve or deny access
export const grantFolderAccess = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { userEmail, access, duration, customEnd } = req.body;
        const owner = req.user;

        // Validate folder ID
        if (!mongoose.Types.ObjectId.isValid(folderId))
            return res.status(400).json({ success: false, message: "Invalid folder ID" });

        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        // Check ownership
        if (folder.owner.toString() !== owner._id.toString())
            return res.status(403).json({ success: false, message: "Not authorized" });

        const user = await User.findOne({ email: userEmail });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Calculate expiration date
        let expiresAt = null;
        const now = new Date();

        switch (duration) {
            case "oneday":
                expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case "oneweek":
                expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case "onemonth":
                expiresAt = new Date(now);
                expiresAt.setMonth(expiresAt.getMonth() + 1);
                break;
            case "custom":
                if (customEnd) expiresAt = new Date(customEnd);
                break;
            case "lifetime":
                expiresAt = new Date(now);
                expiresAt.setFullYear(expiresAt.getFullYear() + 50);
                break;
            case "onetime":
                expiresAt = null;
                break;
            default:
                expiresAt = null;
        }

        // Check for existing permission
        const existing = folder.permissions.find(
            p => p.principal.toString() === user._id.toString()
        );

        if (existing) {
            // Update existing permission
            existing.access = access;
            existing.duration = duration;
            existing.expiresAt = expiresAt;
            if (duration === "onetime") existing.used = false;
        } else {
            // Add new permission
            folder.permissions.push({
                principal: user._id,
                model: "User",
                access,
                duration,
                expiresAt,
                used: duration === "onetime" ? false : undefined
            });
        }

        folder.updatedBy = owner._id;
        await folder.save();

        // Notify user
        await sendEmail({
            to: user.email,
            subject: `Access Granted/Updated - Folder: ${folder.name}`,
            html: `<p>Your access to folder <strong>${folder.name}</strong> has been granted/updated.</p>
               <p><a href="${API_CONFIG.baseUrl}/folders/${folderId}">Open Folder</a></p>
               ${expiresAt ? `<p>Expires: ${expiresAt.toLocaleString()}</p>` : ''}`
        });

        res.json({ success: true, message: "Access granted/updated successfully." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


