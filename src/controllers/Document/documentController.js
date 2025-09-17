// controllers/documentController.js
import mongoose from "mongoose";
import Document from "../../models/Document.js";
import { errorResponse, successResponse, failResponse } from "../../utils/responseHandler.js";

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

        // Text search
        if (search) {
            filter.$text = { $search: search };
        }

        // Filter by status
        if (status) {
            filter.status = { $in: Array.isArray(status) ? status : [status] };
        }

        // Filter by department
        if (department) {
            filter.department = { $in: Array.isArray(department) ? department : [department] };
        }

        // Filter by project
        if (project) {
            filter.project = { $in: Array.isArray(project) ? project : [project] };
        }

        // Filter by owner
        if (owner) {
            filter.owner = { $in: Array.isArray(owner) ? owner : [owner] };
        }

        // Filter by tags
        if (tags) {
            filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }

        // Filter by category
        if (category) {
            filter.category = category;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Execute query with pagination
        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("project", "name")
            .populate("owner", "firstName lastName email")
            .populate("projectManager", "firstName lastName email")
            .populate("documentManager", "firstName lastName email")
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Get total count for pagination
        const total = await Document.countDocuments(filter);

        return successResponse(res, {
            documents,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalDocuments: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        }, "Documents retrieved successfully");
    } catch (error) {
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
            title,
            description,
            project,
            department,
            projectManager,
            documentManager,
            documentDate,
            status,
            tags,
            category,
            metadata,
            compliance,
            workflow,
            files,
            signature,
            link,
            sharedWith,
            sharedWithDepartments,
            isPublic,
            comment
        } = req.body;

        // Create document
        const document = new Document({
            title,
            description,
            project: project || null,
            department,
            projectManager: projectManager || null,
            owner: req.user._id,
            documentManager: documentManager || null,
            documentDate: documentDate || Date.now(),
            status: status || "Draft",
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            category,
            metadata: metadata || {},
            compliance: compliance || { isCompliance: false },
            workflow: workflow || { currentStep: 0, steps: [] },
            files: files || [],
            signature: signature || {},
            link: link || null,
            sharedWith: sharedWith || [],
            sharedWithDepartments: sharedWithDepartments || [],
            isPublic: isPublic || false,
            comment: comment || null
        });

        // Add audit log
        document.auditLog.push({
            action: "create",
            performedBy: req.user._id,
            details: { ...req.body }
        });

        await document.save();

        // Populate references
        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "name" },
            { path: "owner", select: "firstName lastName email" }
        ]);

        return successResponse(res, { document }, "Document created successfully", 201);
    } catch (error) {
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);
            return failResponse(res, "Validation failed", 400, errors);
        }
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
        const permission = document.getUserPermission(req.user._id, req.user.department);
        if (!permission || permission === "view") {
            return failResponse(res, "Insufficient permissions", 403);
        }

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
        document.auditLog.push({
            action: "update",
            performedBy: req.user._id,
            details: updateData
        });

        await document.save();

        // Populate references
        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "name" },
            { path: "owner", select: "firstName lastName email" }
        ]);

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