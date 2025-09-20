// controllers/documentController.js
import mongoose from "mongoose";
import Document from "../../models/Document.js";
import tempFile from "../../models/tempFile.js";
import { errorResponse, successResponse, failResponse } from "../../utils/responseHandler.js";
import TempFile from "../../models/tempFile.js";
import Notification from "../../models/notification.js";

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

        // Fetch documents
        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("project", "name")
            .populate("owner", "firstName lastName email")
            .populate("projectManager", "firstName lastName email")
            .sort(sort)
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
        console.error("Error fetching documents:", error);
        return errorResponse(res, error, "Failed to retrieve documents");
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
            .populate("files.file", "filename originalName size mimetype url");

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
            comment,
            link,
            fileIds
        } = req.body;

        // Parse metadata if it's a JSON string
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            } catch (error) {
                console.error("Error parsing metadata:", error);
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
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => mongoose.Types.ObjectId(id));
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
        let uploadedFiles = [];
        for (const fileId of parsedFileIds) {
            try {
                const tempFile = await TempFile.findById(fileId);
                if (tempFile && tempFile.status === "temp") {
                    tempFile.status = "permanent";
                    await tempFile.save();

                    uploadedFiles.push({
                        file: tempFile.s3Filename,
                        originalName: tempFile.originalName,
                        version: 1,
                        uploadedAt: new Date(),
                        isPrimary: uploadedFiles.length === 0
                    });
                }
            } catch (err) {
                console.warn(`Skipping invalid file ID: ${fileId}`, err);
            }
        }


        let signature = {};
        if (req.files?.signature?.[0]) {
            const file = req.files.signature[0];
            if (!file.mimetype.startsWith("image/")) {
                return failResponse(res, "Signature must be an image", 400);
            }
            signature = {
                fileName: file.originalname,
                fileUrl: file.filename
            };
        }


        const document = new Document({
            project: projectName || null,
            department,
            projectManager: projectManager || null,
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
        console.error("Document creation error:", error);
        return errorResponse(res, error, "Failed to create document");
    }
};

/**
 * Update document
 */
export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Check permissions - only owner or users with edit permission can update
        // const permission = document.getUserPermission(req.user._id, req.user.department);
        // if (!permission || permission === "view") {
        //     return failResponse(res, "Insufficient permissions", 403);
        // }

        // Remove immutable fields
        delete updateData.owner;
        delete updateData.createdAt;
        delete updateData.auditLog;
        delete updateData.accessLog;
        delete updateData.viewCount;
        delete updateData.downloadCount;

        // Update document
        Object.assign(document, updateData);

        // Add audit log
        // document.auditLog.push({
        //     action: "update",
        //     performedBy: req.user._id,
        //     details: updateData
        // });

        await document.save();

        // Populate references
        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "name" },
            { path: "owner", select: "firstName lastName email" }
        ]);
        // ------------------- Create Notification -------------------
        const recipients = [];

        // Notify the document owner if not the updater
        if (document.owner.toString() !== req.user._id.toString()) {
            recipients.push(document.owner);
        }

        // Notify project manager if assigned and not the updater
        if (document.projectManager && document.projectManager.toString() !== req.user._id.toString()) {
            recipients.push(document.projectManager);
        }

        // Send notifications
        for (const recipientId of recipients) {
            await Notification.create({
                recipient: recipientId,
                sender: req.user._id,
                type: "document_updated",
                title: "Document Updated",
                message: `The document "${document.description || "Untitled"}" has been updated.`,
                relatedDocument: document._id,
                priority: "medium",
                actionUrl: `/documents/${document._id}`
            });
        }

        return successResponse(res, { document }, "Document updated successfully");
    } catch (error) {
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);
            return failResponse(res, "Validation failed", 400, errors);
        }
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