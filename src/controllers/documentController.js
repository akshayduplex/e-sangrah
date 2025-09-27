// controllers/documentController.js
import mongoose from "mongoose";
import Document from "../models/Document.js";
import { errorResponse, successResponse, failResponse } from "../utils/responseHandler.js";
import TempFile from "../models/tempFile.js";
import Notification from "../models/notification.js";
import { cloudinary } from "../middlewares/fileUploads.js";
import logger from "../utils/logger.js";

/**
 * Get all documents with filtering, pagination, and search
 */
export const getDocuments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            department,
            project,
            owner,
            tags,
            category,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // Build filter object
        const filter = {};

        // Text search (only if index exists)
        if (search) {
            filter.$text = { $search: search };
        }

        // Utility to handle single or array values
        const toArray = val => (Array.isArray(val) ? val : [val]);

        if (status) filter.status = { $in: toArray(status) };
        if (department) filter.department = { $in: toArray(department).filter(id => mongoose.Types.ObjectId.isValid(id)) };
        if (project) filter.project = { $in: toArray(project).filter(id => mongoose.Types.ObjectId.isValid(id)) };
        if (owner) filter.owner = { $in: toArray(owner).filter(id => mongoose.Types.ObjectId.isValid(id)) };
        if (tags) filter.tags = { $in: toArray(tags) };
        if (category) filter.category = category;

        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("project", "projectName")
            .populate("owner", "name")
            .populate("projectManager", "name")
            .populate("folderId", "name")
            .populate({
                path: "sharedWith.user",
                select: "name"
            })
            .sort(sort)
            .select("metadata signature description project department owner status tags files link createdAt updatedAt sharedWith remark")
            .skip(skip)
            .limit(limitNum);

        // Total count
        const totalDocuments = await Document.countDocuments(filter);

        // Return response
        return successResponse(res, {
            documents,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalDocuments / limitNum),
                totalDocuments,
                hasNext: page * limitNum < totalDocuments,
                hasPrev: page > 1
            }
        }, "Documents retrieved successfully");

    } catch (error) {
        logger.error("Error fetching documents:", error);
        return errorResponse(res, error, "Failed to retrieve documents");
    }

};

/**
 * @desc Get all documents by folderId
 * @route GET /api/documents/folder/:folderId
 * @access Private
 */
export const getDocumentsByFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { page = 1, limit = 20, sortBy = "createdAt", order = "desc", search = "" } = req.query;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: "Invalid folder ID" });
        }

        // Build query
        let query = { folderId: folderId };

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        // Count total documents
        const total = await Document.countDocuments(query);

        // Fetch documents with pagination
        const documents = await Document.find(query)
            .populate("project", "projectName")
            .populate("department", "name")
            .populate("owner", "name email")
            .populate("projectManager", "name email")
            .sort({ [sortBy]: order === "desc" ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            documents
        });

    } catch (err) {
        logger.error("Error fetching documents by folder:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

/**
 * Get single document by ID
 */
export const getDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id)
            .populate("department", "name")
            .populate("project", "name")
            .populate("owner", "firstName lastName email")
            .populate("projectManager", "firstName lastName email")
            .populate("documentManager", "firstName lastName email")
            .populate("sharedWith.user", "firstName lastName email")
            .populate("sharedWithDepartments.department", "name")
            .populate("files.file", "filename originalName size mimetype url")
            .populate("folderId", "name");

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Check access permissions
        const hasAccess = document.hasAccess(req.user._id, req.user.department);
        if (!hasAccess) {
            return failResponse(res, "Access denied", 403);
        }

        // Add access log for view
        await document.addAccessLog(req.user._id, "view", req.ip, req.get("User-Agent"));

        return successResponse(res, { document }, "Document retrieved successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to retrieve document");
    }
};

/**
 * Create new document
 */
export const createDocument = async (req, res) => {
    try {
        const {
            projectName,
            department,
            projectManager,
            documentDate,
            tags,
            metadata,
            description,
            compliance,
            expiryDate,
            folderId,
            comment,
            link,
            fileIds
        } = req.body;
        // Validate folderId if provided
        let validFolderId = null;
        if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
            validFolderId = folderId;
        }
        // Parse metadata if it's a JSON string
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            } catch (error) {
                logger.error("Error parsing metadata:", error);
            }
        }

        // Parse tags if they're comma-separated
        const parsedTags = tags ? tags.split(",").map(tag => tag.trim()) : [];

        const isCompliance = compliance === "yes";

        // Fix date parsing
        let parsedDocumentDate;
        if (documentDate) {
            if (documentDate.includes("-")) {
                const [day, month, year] = documentDate.split("-");
                parsedDocumentDate = new Date(`${year}-${month}-${day}`);
            } else {
                parsedDocumentDate = new Date(documentDate);
            }
            if (isNaN(parsedDocumentDate.getTime())) {
                return failResponse(res, "Invalid document date format", 400);
            }
        } else {
            parsedDocumentDate = new Date();
        }

        // Parse expiry date if needed
        let parsedExpiryDate = null;
        if (isCompliance && expiryDate) {
            if (expiryDate.includes("-")) {
                const [day, month, year] = expiryDate.split("-");
                parsedExpiryDate = new Date(`${year}-${month}-${day}`);
            } else {
                parsedExpiryDate = new Date(expiryDate);
            }
            if (isNaN(parsedExpiryDate.getTime())) {
                return failResponse(res, "Invalid expiry date format", 400);
            }
        }
        let parsedFileIds = [];
        if (fileIds) {
            if (typeof fileIds === "string") {
                try {
                    parsedFileIds = JSON.parse(fileIds);
                    if (!Array.isArray(parsedFileIds)) parsedFileIds = [parsedFileIds];
                } catch (err) {
                    parsedFileIds = [fileIds]; // fallback single id
                }
            } else if (Array.isArray(fileIds)) {
                parsedFileIds = fileIds;
            }

            // Convert to ObjectId and filter invalid ones
            parsedFileIds = parsedFileIds
                .filter(id => mongoose.Types.ObjectId.isValid(id))   // ✅ just call it
                .map(id => new mongoose.Types.ObjectId(id));         // ✅ only wrap here

        }
        // // Handle uploaded files (using string filenames - Option A)
        // const uploadedFiles = (req.files?.files || []).map((file, idx) => ({
        //     file: file.filename, // Store filename as string
        //     originalName: file.originalname,
        //     version: 1,
        //     uploadedAt: new Date(),
        //     isPrimary: idx === 0
        // }));
        // Handle uploaded files from temp file IDs
        // Handle uploaded files from tempFile IDs (already on S3)
        let uploadedFiles = [];
        for (const fileId of parsedFileIds) {
            try {
                const tempFile = await TempFile.findById(fileId);
                if (tempFile && tempFile.status === "temp") {
                    tempFile.status = "permanent";
                    await tempFile.save();

                    uploadedFiles.push({
                        file: tempFile.s3Filename,       // S3 key
                        s3Url: tempFile.s3Url,           // S3 URL
                        originalName: tempFile.originalName,
                        version: 1,
                        uploadedAt: new Date(),
                        isPrimary: uploadedFiles.length === 0
                    });
                }
            } catch (err) {
                logger.warn(`Skipping invalid file ID: ${fileId}`, err);
            }
        }
        let signature = {};

        // Case 1: Signature uploaded as file
        if (req.files?.signatureFile?.[0]) {
            const file = req.files.signatureFile[0];
            if (!file.mimetype.startsWith("image/")) {
                return failResponse(res, "Signature must be an image", 400);
            }
            signature = {
                fileName: file.originalname,
                fileUrl: file.path || file.filename, // Cloudinary gives .path (URL)
            };
        }

        // Case 2: Signature drawn on canvas (base64 string)
        else if (req.body.signature) {
            const base64Data = req.body.signature;

            if (!base64Data.startsWith("data:image/")) {
                return failResponse(res, "Invalid signature format", 400);
            }

            // Upload base64 to Cloudinary
            const uploaded = await cloudinary.uploader.upload(base64Data, {
                folder: "signatures",
                public_id: `signature-${Date.now()}`,
                overwrite: true,
            });

            signature = {
                fileName: uploaded.original_filename,
                fileUrl: uploaded.secure_url,
            };
        }


        const document = new Document({
            project: projectName || null,
            department,
            projectManager: projectManager || null,
            folderId: validFolderId,
            owner: req.user._id,
            documentManager: null,
            documentDate: parsedDocumentDate,
            status: "Draft",
            tags: parsedTags,
            category: null,
            metadata: parsedMetadata,
            description,
            compliance: {
                isCompliance,
                expiryDate: parsedExpiryDate
            },
            files: uploadedFiles,
            signature,
            link: link || null,
            comment: comment || null
        });
        // ------------------- Create Notification -------------------
        if (projectManager) {
            await Notification.create({
                recipient: projectManager,
                sender: req.user._id,
                type: "document_shared",
                title: "New Document Assigned",
                message: `A new document "${description || "Untitled"}" has been shared with you.`,
                relatedDocument: document._id,
                priority: "medium",
                actionUrl: `/documents/${document._id}`
            });
        }
        await document.save();

        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "projectName" },
            { path: "owner", select: "firstName lastName email" }
        ]);

        return successResponse(res, { document }, "Document created successfully", 201);
    } catch (error) {
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);
            return failResponse(res, "Validation failed", 400, errors);
        }
        logger.error("Document creation error:", error);
        return errorResponse(res, error, "Failed to create document");
    }
};

/**
 * Update document
 */
export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findById(id);
        if (!document) return failResponse(res, "Document not found", 404);

        // Update folder if provided
        if (req.body.folderId && mongoose.Types.ObjectId.isValid(req.body.folderId)) {
            document.folderId = req.body.folderId;
        }

        const {
            projectName,
            department,
            projectManager,
            documentDate,
            tags,
            metadata,
            description,
            compliance,
            expiryDate,
            comment,
            link,
            fileIds
        } = req.body;

        // Parse metadata
        let parsedMetadata = {};
        if (metadata) {
            try { parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata; }
            catch (err) { logger.warn("Invalid metadata", err); }
        }

        // Parse tags
        const parsedTags = tags ? tags.split(",").map(tag => tag.trim()) : [];

        // Update basic fields
        document.project = projectName || document.project;
        document.department = department || document.department;
        document.projectManager = projectManager || document.projectManager;
        document.description = description ?? document.description;
        document.comment = comment ?? document.comment;
        document.link = link ?? document.link;
        document.tags = parsedTags;
        document.metadata = parsedMetadata;

        // Update document date
        if (documentDate) {
            const [day, month, year] = documentDate.split("-");
            document.documentDate = new Date(`${year}-${month}-${day}`);
        }

        // Compliance
        if (compliance) {
            document.compliance.isCompliance = compliance === "yes";
            if (expiryDate) {
                const [day, month, year] = expiryDate.split("-");
                document.compliance.expiryDate = new Date(`${year}-${month}-${day}`);
            }
        }

        // Handle files already uploaded to S3 via TempFile IDs
        if (fileIds) {
            let parsedFileIds = typeof fileIds === "string" ? JSON.parse(fileIds) : fileIds;
            const uploadedFiles = [];
            for (const fileId of parsedFileIds) {
                const tempFile = await TempFile.findById(fileId);
                if (tempFile && tempFile.status === "temp") {
                    tempFile.status = "permanent";
                    await tempFile.save();

                    uploadedFiles.push({
                        file: tempFile.s3Filename,
                        s3Url: tempFile.s3Url,
                        originalName: tempFile.originalName,
                        version: 1,
                        uploadedAt: new Date(),
                        isPrimary: uploadedFiles.length === 0
                    });
                }
            }
            if (uploadedFiles.length) document.files = uploadedFiles;
        }

        // Signature handling
        if (req.files?.signature?.[0]) {
            const file = req.files.signature[0];
            if (!file.mimetype.startsWith("image/")) {
                return failResponse(res, "Signature must be an image", 400);
            }
            document.signature = {
                fileName: file.originalname,
                fileUrl: file.path || file.filename,
            };
        } else if (req.body.signature) {
            const base64Data = req.body.signature;
            if (!base64Data.startsWith("data:image/")) {
                return failResponse(res, "Invalid signature format", 400);
            }

            // Upload base64 to Cloudinary
            const uploaded = await cloudinary.uploader.upload(base64Data, {
                folder: "signatures",
                public_id: `signature-${Date.now()}`,
                overwrite: true,
            });

            document.signature = {
                fileName: uploaded.original_filename,
                fileUrl: uploaded.secure_url,
            };
        }

        await document.save();
        return successResponse(res, { document }, "Document updated successfully");

    } catch (error) {
        logger.error("Update error:", error);
        return errorResponse(res, error, "Failed to update document");
    }
};

/**
 * Delete document
 */
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Only owner can delete
        if (document.owner.toString() !== req.user._id.toString()) {
            return failResponse(res, "Only the owner can delete this document", 403);
        }

        await Document.findByIdAndDelete(id);

        return successResponse(res, {}, "Document deleted successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to delete document");
    }
};

/**
 * Update document status
 */
export const updateDocumentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const validStatuses = ["Draft", "Pending", "UnderReview", "Approved", "Rejected", "Archived"];
        if (!validStatuses.includes(status)) {
            return failResponse(res, "Invalid status", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Check permissions
        const permission = document.getUserPermission(req.user._id, req.user.department);
        if (!permission || permission === "view") {
            return failResponse(res, "Insufficient permissions", 403);
        }

        document.status = status;
        if (comment) {
            document.comment = comment;
        }

        // Add audit log
        document.auditLog.push({
            action: "status_update",
            performedBy: req.user._id,
            details: { previousStatus: document.status, newStatus: status, comment }
        });

        await document.save();

        return successResponse(res, { document }, "Document status updated successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to update document status");
    }
};

/**
 * Share document with users or departments
 */
export const shareDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { users, departments } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Only owner can share
        if (document.owner.toString() !== req.user._id.toString()) {
            return failResponse(res, "Only the owner can share this document", 403);
        }

        // Add users to sharedWith
        if (users && Array.isArray(users)) {
            users.forEach(user => {
                const existingShare = document.sharedWith.find(
                    share => share.user.toString() === user.user.toString()
                );
                if (!existingShare) {
                    document.sharedWith.push({
                        user: user.user,
                        permission: user.permission || "view",
                        sharedBy: req.user._id
                    });
                }
            });
        }

        // Add departments to sharedWithDepartments
        if (departments && Array.isArray(departments)) {
            departments.forEach(dept => {
                const existingShare = document.sharedWithDepartments.find(
                    share => share.department.toString() === dept.department.toString()
                );
                if (!existingShare) {
                    document.sharedWithDepartments.push({
                        department: dept.department,
                        permission: dept.permission || "view",
                        sharedBy: req.user._id
                    });
                }
            });
        }

        // Add audit log
        document.auditLog.push({
            action: "share",
            performedBy: req.user._id,
            details: { users, departments }
        });

        await document.save();

        return successResponse(res, { document }, "Document shared successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to share document");
    }
};

/**
 * Get document audit logs
 */
export const getDocumentAuditLogs = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id)
            .populate("auditLog.performedBy", "firstName lastName email")
            .select("auditLog");

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Check access permissions
        const hasAccess = document.hasAccess(req.user._id, req.user.department);
        if (!hasAccess) {
            return failResponse(res, "Access denied", 403);
        }

        return successResponse(res, { auditLogs: document.auditLog }, "Audit logs retrieved successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to retrieve audit logs");
    }
};

/**
 * Get document access logs
 */
export const getDocumentAccessLogs = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id)
            .populate("accessLog.accessedBy", "firstName lastName email")
            .select("accessLog");

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Only owner can view access logs
        if (document.owner.toString() !== req.user._id.toString()) {
            return failResponse(res, "Only the owner can view access logs", 403);
        }

        return successResponse(res, { accessLogs: document.accessLog }, "Access logs retrieved successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to retrieve access logs");
    }
};

/**
 * Search documents
 */
export const searchDocuments = async (req, res) => {
    try {
        const { q, fields = "title description tags" } = req.query;

        if (!q) {
            return failResponse(res, "Search query is required", 400);
        }

        const searchFields = fields.split(",").map(field => field.trim());
        const searchConditions = searchFields.map(field => ({
            [field]: { $regex: q, $options: "i" }
        }));

        const documents = await Document.find({
            $or: searchConditions
        })
            .populate("department", "name")
            .populate("owner", "firstName lastName email")
            .limit(50);

        return successResponse(res, { documents }, "Search results retrieved successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to search documents");
    }
};