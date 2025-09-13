import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import path from "path";
import Document from "../../models/Document.js";
import File from "../../models/File.js";
import { successResponse, failResponse, errorResponse } from "../../utils/responseHandler.js";


// Get documents uploaded by user
export const getUserUploadedDocuments = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const docs = await Document.find({ owner: req.user._id })
            .populate("owner", "name")
            .populate("department", "name")
            .populate("project", "name")
            .populate("files.file", "originalName extension")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const result = docs.map(doc => ({
            fileName: doc.files[0]?.file?.originalName || null,
            fileType: doc.files[0]?.file?.extension || null,
            owner: doc.owner?.name || null,
            sharedWith: doc.sharedWith?.map(s => s.user?.name).filter(Boolean) || [],
            lastModifiedOn: doc.updatedAt,
            department: doc.department?.name || null,
            project: doc.project?.name || null
        }));

        const total = await Document.countDocuments({ owner: req.user._id });

        return successResponse(res, {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            documents: result
        }, "User documents fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Create a new document with files (GridFS)
export const createDocument = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { title, description, department, project, tags } = req.body;
        const owner = req.user?._id;

        if (!owner) return failResponse(res, "Owner is required", 400);
        if (!title || !department) return failResponse(res, "Title and Department are required", 400);

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: "documents" });

        // Upload files to GridFS
        const filePromises = (req.files || []).map(file => new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(file.originalname, {
                metadata: { originalName: file.originalname, uploadedBy: owner, uploadedAt: new Date(), mimetype: file.mimetype, size: file.size }
            });
            uploadStream.end(file.buffer);

            uploadStream.on("finish", async () => {
                try {
                    const parsed = path.parse(file.originalname);
                    const newFile = new File({
                        filename: uploadStream.filename,
                        originalName: parsed.name,
                        size: file.size,
                        mimetype: file.mimetype,
                        extension: parsed.ext.replace(".", "").toLowerCase(),
                        gridfsId: uploadStream.id,
                        uploadedBy: owner
                    });
                    const savedFile = await newFile.save({ session });
                    resolve(savedFile._id);
                } catch (err) {
                    reject(err);
                }
            });

            uploadStream.on("error", reject);
        }));

        const savedFileIds = await Promise.all(filePromises);

        // Create document
        const newDoc = new Document({
            title: title.trim(),
            description: description?.trim(),
            department,
            project: project || null,
            owner,
            tags: tags ? tags.split(",").map(t => t.trim().toLowerCase()) : [],
            files: savedFileIds.map((fileId, idx) => ({ file: fileId, isPrimary: idx === 0, version: 1 })),
            currentVersion: 1,
            auditLog: [{ action: "created", performedBy: owner, details: { title, department } }]
        });

        await newDoc.save({ session });
        await session.commitTransaction();
        session.endSession();

        return successResponse(res, newDoc, "Document created successfully", 201);

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating document:", err);
        return errorResponse(res, err, "Failed to create document");
    }
};

// Update document fields
export const toggleFields = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid document ID", 400);

        const doc = await Document.findById(id);
        if (!doc) return failResponse(res, "Document not found", 404);

        const permission = doc.getUserPermission(req.user._id, req.user.department);
        if (!["edit"].includes(permission)) return failResponse(res, "Permission denied", 403);

        Object.keys(body).forEach(field => doc[field] = body[field]);
        await doc.addAuditLog("toggleFields", req.user._id, body);
        await doc.save();

        return successResponse(res, doc, "Document updated successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get recent documents
export const getRecentDocuments = async (req, res) => {
    try {
        const { page = 1, limit = 10, departmentId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const matchQuery = {};
        if (departmentId) matchQuery.department = departmentId;
        else if (!["admin", "superadmin"].includes(req.user.profile_type)) matchQuery.department = req.user.department;

        const docs = await Document.find(matchQuery)
            .populate("owner", "name")
            .populate("department", "name")
            .populate("project", "name")
            .populate("files.file", "originalName extension size")
            .populate("sharedWith.user", "name")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const result = docs.map(doc => ({
            fileName: doc.files[0]?.file?.originalName || null,
            fileType: doc.files[0]?.file?.extension || null,
            size: doc.files[0]?.file?.size || null,
            owner: doc.owner?.name || null,
            sharedWith: doc.sharedWith?.map(u => u.user?.name).filter(Boolean) || [],
            createdOn: doc.createdAt,
            lastModifiedOn: doc.updatedAt,
            department: doc.department?.name || null,
            project: doc.project?.name || null,
            status: doc.status,
            description: doc.description,
            remark: doc.remark || null,
            tags: doc.tags || [],
            metadata: doc.metadata || []
        }));

        const total = await Document.countDocuments(matchQuery);

        return successResponse(res, {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            documents: result
        }, "Recent documents fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const ip = req.ip;
        const userAgent = req.get("User-Agent");

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid document ID", 400);

        const doc = await Document.findById(id).populate("owner department project files.file");
        if (!doc) return failResponse(res, "Document not found", 404);
        if (!doc.hasAccess(req.user._id, req.user.department)) return failResponse(res, "Access denied", 403);

        await doc.addAccessLog(req.user._id, "view", ip, userAgent);
        return successResponse(res, doc, "Document fetched successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Update document
export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid document ID", 400);

        const doc = await Document.findById(id);
        if (!doc) return failResponse(res, "Document not found", 404);

        const permission = doc.getUserPermission(req.user._id, req.user.department);
        if (permission !== "edit") return failResponse(res, "Permission denied", 403);

        Object.assign(doc, req.body);
        await doc.addAuditLog("update", req.user._id, req.body);
        await doc.save();

        return successResponse(res, doc, "Document updated successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Delete document
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) return failResponse(res, "Invalid document ID", 400);

        const doc = await Document.findById(id);
        if (!doc) return failResponse(res, "Document not found", 404);

        if (doc.owner.toString() !== req.user._id.toString()) return failResponse(res, "Only owner can delete document", 403);

        await doc.addAuditLog("delete", req.user._id);
        await doc.deleteOne();

        return successResponse(res, {}, "Document deleted successfully");

    } catch (err) {
        return errorResponse(res, err);
    }
};

// Download file
export const downloadFile = async (req, res) => {
    try {
        const { docId, fileId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(docId) || !mongoose.Types.ObjectId.isValid(fileId))
            return failResponse(res, "Invalid IDs", 400);

        const doc = await Document.findById(docId).populate("files.file");
        if (!doc) return failResponse(res, "Document not found", 404);

        if (!doc.hasAccess(req.user._id, req.user.department)) return failResponse(res, "Access denied", 403);

        const fileEntry = doc.files.find(f => f.file._id.toString() === fileId);
        if (!fileEntry) return failResponse(res, "File not found", 404);

        await doc.addAccessLog(req.user._id, "download", req.ip, req.get("User-Agent"));

        res.download(fileEntry.file.path, fileEntry.file.filename);

    } catch (err) {
        return errorResponse(res, err);
    }
};
