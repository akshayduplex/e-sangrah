// controllers/documentController.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Document from "../models/Document.js";
import { errorResponse, successResponse, failResponse } from "../utils/responseHandler.js";
import TempFile from "../models/TempFile.js";
import { cloudinary } from "../middlewares/fileUploads.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../services/emailService.js";
import User from "../models/User.js";
import Designation from "../models/Designation.js";
import SharedWith from "../models/SharedWith.js";
import File from "../models/File.js";
import { bumpVersion } from "../utils/bumpVersion.js";
import _ from "lodash";
import Approval from "../models/Approval.js";
import { getObjectUrl } from "../utils/s3Helpers.js";
import { decrypt } from "../helper/SymmetricEncryption.js";
import { generateShareLink } from "../helper/GenerateUniquename.js";
import { accessGrantedTemplate } from "../emailTemplates/accessGrantedTemplate.js";
import { accessRequestTemplate } from "../emailTemplates/accessRequestTemplate.js";
import { accessExpiredTemplate, alertRedirectTemplate } from "../emailTemplates/accessExpiredTemplate.js";
import { inviteUserTemplate } from "../emailTemplates/inviteUserTemplate.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";
import PermissionLogs from "../models/PermissionLogs.js";

//Page Controllers

// Document List page
export const showDocumentListPage = async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/document/document-list", {
            title: "E-Sangrah - Documents-List",
            designations,
            user: req.user
        });
    } catch (err) {
        logger.error("Error loading document list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load documents",
        });
    }
};

// Add Document page
export const showAddDocumentPage = async (req, res) => {
    try {
        res.render("pages/document/add-document", {
            title: "E-Sangrah - Add-Document",
            user: req.user,
            isEdit: false
        });
    } catch (err) {
        logger.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
};
// Edit Document page
export const showEditDocumentPage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).render("pages/error", {
                title: "Error",
                message: "Invalid document ID",
            });
        }

        // In your controller
        const document = await Document.findById(req.params.id)
            .populate('project')
            .populate('department')
            .populate('projectManager')
            .populate('documentDonor')
            .populate('documentVendor')
            .populate('folderId')
            .populate('files')
            .lean();

        if (!document) {
            return res.status(404).render("pages/error", {
                title: "Error",
                message: "Document not found",
            });
        }

        res.render("pages/document/edit", {
            title: "E-Sangrah - Edit Document",
            user: req.user,
            document,
            isEdit: true
        });
    } catch (err) {
        logger.error("Error loading edit-document page:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load edit document page",
        });
    }
};
// View Document page
export const showViewDocumentPage = async (req, res) => {
    try {
        res.render("pages/document/viewDocument", {
            title: "E-Sangrah - View-Document",
            user: req.user,
            documentId: req.params.id
        });
    } catch (err) {
        logger.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
};

// Archived Document page
export const showArchivedDocumentPage = async (req, res) => {
    try {
        res.render("pages/document/archiveDocuments", {
            title: "E-Sangrah - Archive-Document",
            user: req.user,
        });
    } catch (err) {
        logger.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
};


/**
 * GET /documents/:id/view
 * Render a page to view files of a document
 */
export const viewDocumentFiles = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) throw new Error("Invalid link");

        let decrypted;
        try {
            decrypted = JSON.parse(decrypt(token));
        } catch (err) {
            return res.render("pages/viewDocumentFiles", {
                expiredMessage: "Invalid or corrupted link.",
                canRenew: false,
                documentTitle: "Document",
                user: req.user,
                sharedAccess: null,
                file: null,
                sharedId: null,
                documentId: null
            });
        }

        const { id: documentId, fileId } = decrypted;
        const userId = req.user?._id;

        // --- Check if user has valid shared access ---
        let sharedAccess = await SharedWith.findOne({
            document: documentId,
            user: userId,
            generalAccess: true
        }).populate("document");

        const now = new Date();
        let expiredMessage = null;

        if (!sharedAccess) {
            expiredMessage = "You don't have access to this document.";
        } else {
            // Check expiration
            const isExpired = sharedAccess.expiresAt && now > sharedAccess.expiresAt;
            const isUsed = sharedAccess.duration === "onetime" && sharedAccess.used;

            if (isExpired) expiredMessage = "This link has expired.";
            if (isUsed) expiredMessage = "This one-time link has already been used.";

            // Mark one-time link as used
            if (sharedAccess.duration === "onetime" && !sharedAccess.used) {
                sharedAccess.used = true;
                await sharedAccess.save();
            }
        }

        // --- Fetch file if access exists ---
        let file = null;
        if (sharedAccess && !expiredMessage) {
            file = await File.findById(fileId)
                .populate("document")
                .populate("uploadedBy", "name email")
                .exec();
        }

        let fileUrl = null;
        if (file) {
            fileUrl = file.s3Url || (file.file ? await getObjectUrl(file.file, 3600) : null);
        }

        // --- Helpers ---
        const formatFileSize = (bytes) => {
            if (!bytes) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        };

        const getFileType = (filename) => {
            const ext = filename.split(".").pop().toLowerCase();
            return {
                isPDF: ext === "pdf",
                isWord: ["doc", "docx"].includes(ext),
                isExcel: ["xls", "xlsx"].includes(ext),
                isPowerPoint: ["ppt", "pptx"].includes(ext),
                isText: ["txt", "md", "json", "xml", "html", "csv"].includes(ext),
                extension: ext
            };
        };

        res.render("pages/viewDocumentFiles", {
            expiredMessage,
            canRenew: expiredMessage ? true : false,
            documentTitle: sharedAccess?.document?.title || "Document",
            user: req.user,
            sharedAccess,       // Pass sharedAccess to EJS
            sharedId: sharedAccess?._id || null,
            documentId,
            file: file
                ? {
                    ...file.toObject(),
                    formattedSize: formatFileSize(file.fileSize),
                    fileUrl,
                    fileType: getFileType(file.originalName)
                }
                : null
        });
    } catch (error) {
        console.error(error);
        res.render("pages/viewDocumentFiles", {
            expiredMessage: "Server error while fetching file.",
            canRenew: false,
            documentTitle: "Document",
            user: req.user,
            sharedAccess: null,
            file: null,
            sharedId: null,
            documentId: null
        });
    }
};


export const viewGrantAccessPage = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, API_CONFIG.ACCESS_GRANT_SECRET || "supersecretkey");

        const { docId, userId, action } = decoded;
        if (action !== "approveAccess") throw new Error("Invalid token");

        const doc = await Document.findById(docId);
        const user = await User.findById(userId);
        if (!doc || !user) throw new Error("Invalid document or user");

        res.render("pages/admin/grantAccess", {
            document: doc,
            requester: user,
            user: req.user,
            token
        });

    } catch (err) {
        res.send(`<h2>Invalid or expired link</h2><p>${err.message}</p>`);
    }
};
//API Controllers


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
            date,
            orderColumn,
            orderDir
        } = req.query;
        const userId = req.user?._id;
        const filter = {
            isDeleted: false, isArchived: false,
            $or: [
                { owner: userId },
                { sharedWithUsers: userId }
            ]
        };
        const toArray = val => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            return val.split(',').map(v => v.trim()).filter(Boolean);
        };
        // --- Search ---
        if (search?.trim()) {
            const safeSearch = search.trim();
            filter.$or = [
                { "metadata.fileName": { $regex: safeSearch, $options: "i" } },
                { "metadata.fileDescription": { $regex: safeSearch, $options: "i" } },
                { description: { $regex: safeSearch, $options: "i" } },
                { tags: { $in: [new RegExp(safeSearch, "i")] } },
                { "files.originalName": { $regex: safeSearch, $options: "i" } },
                { remark: { $regex: safeSearch, $options: "i" } }
            ];
        }

        // --- Status ---
        if (status) {
            const normalizedStatus = status.replace(/\s+/g, ' ').trim();
            if (normalizedStatus === "Compliance and Retention") {
                filter["compliance.isCompliance"] = true;
            } else {
                filter.status = normalizedStatus;
            }
        }

        // Department filter
        if (department) {
            const deptArray = toArray(department).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (deptArray.length > 0) {
                filter.department = deptArray.length === 1 ? deptArray[0] : { $in: deptArray };
            }
        }

        // Project filter
        if (project) {
            const projArray = toArray(project).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (projArray.length > 0) {
                filter.project = projArray.length === 1 ? projArray[0] : { $in: projArray };
            }
        }

        // --- Date filter ---
        if (date) {
            const [day, month, year] = date.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            if (!isNaN(selectedDate.getTime())) {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(nextDate.getDate() + 1);
                filter.createdAt = { $gte: selectedDate, $lt: nextDate };
            }
        }

        // --- Column Sorting ---
        const columnMap = {
            1: "metadata.fileName",
            2: "updatedAt",
            3: "owner.name",
            4: "department.name",
            5: "project.projectName",
            9: "tags",
            10: "metadata",
            14: "status"
        };

        const sortField = columnMap[orderColumn] || "createdAt";
        const sortOrder = orderDir === "asc" ? 1 : -1;

        // --- Pagination ---
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const documents = await Document.find(filter)
            .select("files updatedAt createdAt signature isDeleted isArchived comment sharedWithUsers compliance status metadata tags owner documentVendor documentDonor department project description")
            .populate("department", "name")
            .populate("project", "projectName")
            .populate({
                path: "owner",
                select: "name email profile_image userDetails.designation",
                populate: {
                    path: "userDetails.designation",
                    select: "name"
                }
            })
            .populate("documentDonor", "name profile_image")
            .populate("documentVendor", "name profile_image")
            .populate("sharedWithUsers", "name profile_image email")
            .populate("files", "originalName version fileSize")
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalDocuments = await Document.countDocuments(filter);

        return successResponse(res, {
            documents,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(totalDocuments / limitNum),
                totalDocuments,
                hasNext: pageNum * limitNum < totalDocuments,
                hasPrev: pageNum > 1
            }
        }, "Documents retrieved successfully");

    } catch (error) {
        console.error(error);
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
            .select("")
            .populate("department", "name")
            .populate("project", "name")
            .populate("owner", "name email")
            .populate("projectManager", "name email")
            // .populate("department", "name")
            .populate("sharedWithUsers", "name email")
            // .populate("sharedWithDepartments.department", "name")
            .populate("files.file", "filename originalName size mimetype url")
            .populate("folderId", "name");

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        return successResponse(res, { document }, "Document retrieved successfully");
    } catch (error) {
        return errorResponse(res, error, "Failed to retrieve document");
    }
};

/**
 * Get all documents in Recycle Bin
 * @route GET /api/documents/recycle-bin
 * @query page, limit, search (optional), department (optional)
 */
export const getRecycleBinDocuments = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Filters
        const search = req.query.search ? req.query.search.trim() : "";
        const department = req.query.department || "";

        // Only documents owned by the current user
        const query = {
            owner: userId,
            isDeleted: true
        };

        // Search filter
        if (search) {
            query.$or = [
                { "metadata.fileName": { $regex: search, $options: "i" } },
                { tags: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        // Department filter
        if (department) {
            query.department = department;
        }

        // Fetch documents & total count
        const [documents, total] = await Promise.all([
            Document.find(query)
                .select("files tags createdAt isDeleted deletedAt department metadata")
                .populate("department", "name")
                .populate("files", "originalName version fileSize")
                .populate("owner", "name email")
                .sort({ deletedAt: -1 })
                .skip(skip)
                .limit(limit),
            Document.countDocuments(query)
        ]);

        return res.json({
            success: true,
            message: "Recycle bin documents fetched successfully",
            data: documents,
            total,
            page,
            limit
        });
    } catch (err) {
        console.error("Get recycle bin documents error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
            error: err.message
        });
    }
};

/**
 * Archive or unarchive a document
 * @route PATCH /api/documents/:id/archive?isArchived=true|false
 */
export const archiveDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { isArchived } = req.query;

        if (typeof isArchived === "undefined") {
            return failResponse(res, "Missing query parameter: isArchived", 400);
        }

        const archiveStatus = isArchived === "true";

        // Find and update document
        const updatedDoc = await Document.findByIdAndUpdate(
            id,
            { isArchived: archiveStatus },
            { new: true }
        );

        if (!updatedDoc) {
            return failResponse(res, "Document not found", 404);
        }

        return successResponse(
            res,
            updatedDoc,
            archiveStatus
                ? "Document archived successfully"
                : "Document unarchived successfully"
        );
    } catch (err) {
        console.error("Archive document error:", err);
        return errorResponse(res, err, "Failed to archive/unarchive document");
    }
};

/**
 * Get archived or unarchived documents
 * @route GET /api/documents/archive?isArchived=true|false
 */
export const getArchivedDocuments = async (req, res) => {
    try {
        const draw = parseInt(req.query.draw) || 1;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const orderColumn = req.query.orderColumn || 'updatedAt';
        const orderDir = req.query.orderDir === 'asc' ? 1 : -1;

        const userId = req.user?._id; // ensure your auth middleware sets req.user

        // --- Base query: only archived docs owned by user ---
        const query = {
            isArchived: true,
            isDeleted: false,
            owner: userId  // Only owner documents
        };

        // --- Department filter ---
        if (req.query.department && req.query.department !== 'all') {
            query.department = req.query.department;
        }

        // --- Search filter ---
        if (search) {
            query['files'] = {
                $elemMatch: { originalName: { $regex: search, $options: 'i' } }
            };
        }

        // --- Fetch documents + total count ---
        const [documents, total] = await Promise.all([
            Document.find(query)
                .populate("department", "name")
                .populate("files", "originalName version isPrimary fileSize")
                .sort({ [orderColumn]: orderDir })
                .skip(skip)
                .limit(limit),
            Document.countDocuments(query)
        ]);

        return res.json({
            draw,
            recordsTotal: total,
            recordsFiltered: total,
            data: documents
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Restore a soft-deleted document
export const restoreDocument = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid document ID." });
    }

    try {
        const document = await Document.findOne({ _id: id, isDeleted: true });

        if (!document) {
            return res.status(404).json({ message: "Document not found or not deleted." });
        }

        document.isDeleted = false;
        document.deletedAt = null;

        await document.save();

        return res.status(200).json({
            message: "Document restored successfully.",
            document
        });
    } catch (error) {
        console.error("Error restoring document:", error);
        return res.status(500).json({ message: "Server error while restoring document." });
    }
};

/**
 * Create new document
 */
export const createDocument = async (req, res) => {
    try {
        const {
            project,
            department,
            projectManager,
            documentDate,
            documentDonor,
            documentVendor,
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

        // ------------------- Validate folder -------------------
        const validFolderId = folderId && mongoose.Types.ObjectId.isValid(folderId) ? folderId : null;

        // ------------------- Parse metadata -------------------
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
            } catch (err) {
                logger.error("Error parsing metadata:", err);
            }
        }

        // ------------------- Parse tags -------------------
        const parsedTags = tags ? (typeof tags === "string" ? tags.split(",").map(t => t.trim()) : tags) : [];

        // ------------------- Parse fileIds -------------------
        let parsedFileIds = [];
        if (fileIds) {
            if (typeof fileIds === "string") {
                try {
                    parsedFileIds = JSON.parse(fileIds);
                    if (!Array.isArray(parsedFileIds)) parsedFileIds = [parsedFileIds];
                } catch {
                    parsedFileIds = [fileIds];
                }
            } else if (Array.isArray(fileIds)) {
                parsedFileIds = fileIds;
            }
        }
        parsedFileIds = [...new Set(parsedFileIds)]
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        // ------------------- Parse compliance -------------------
        const isCompliance = compliance === "yes";
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

        // ------------------- Parse document date -------------------
        let parsedDocumentDate = new Date();
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
        }

        // ------------------- Create Document -------------------
        const document = new Document({
            project: project || null,
            department,
            projectManager: projectManager || null,
            documentDonor: documentDonor || null,
            documentVendor: documentVendor || null,
            folderId: validFolderId,
            owner: req.user._id,
            documentDate: parsedDocumentDate,
            status: "Draft",
            tags: parsedTags,
            metadata: parsedMetadata,
            description,
            compliance: { isCompliance, expiryDate: parsedExpiryDate },
            files: [],
            signature: {},
            link: link || null,
            comment: comment || null,
            versioning: {
                currentVersion: mongoose.Types.Decimal128.fromString("1.0"),
                previousVersion: null,
                nextVersion: null,
                firstVersion: mongoose.Types.Decimal128.fromString("1.0"),
            },
            versionHistory: [
                {
                    version: mongoose.Types.Decimal128.fromString("1.0"),
                    timestamp: new Date(),
                    changedBy: req.user._id,
                    changes: "Initial document creation",
                    snapshot: {},
                },
            ],
        });

        await document.save();
        // ------------------- Process TempFiles and create Files -------------------
        const fileDocs = [];
        for (const tempFileId of parsedFileIds) {
            try {
                const tempFile = await TempFile.findById(tempFileId);
                if (!tempFile || tempFile.status !== "temp") {
                    continue;
                }

                // Create permanent File record
                const newFile = await File.create({
                    document: document._id,
                    file: tempFile.s3Filename,
                    s3Url: tempFile.s3Url,
                    originalName: tempFile.originalName,
                    fileType: tempFile.fileType,
                    folder: tempFile.folder || folderId || null,
                    projectId: document.project || null,
                    departmentId: document.department || null,
                    version: 1,
                    uploadedBy: req.user._id,
                    uploadedAt: new Date(),
                    fileSize: tempFile.size,
                    hash: tempFile.hash || null,
                    isPrimary: fileDocs.length === 0,
                    status: "active",
                });

                // Update TempFile status
                tempFile.status = "permanent";
                await tempFile.save();

                fileDocs.push(newFile._id);

            } catch (err) {
                console.error(`Error processing temp file ${tempFileId}:`, err);
            }
        }

        if (fileDocs.length > 0) {
            document.files = fileDocs;
            await document.save();
        } else {
            console.log("No files were added to document");
        }

        // ------------------- Handle Signature -------------------
        if (req.files?.signatureFile?.[0]) {
            const file = req.files.signatureFile[0];
            if (!file.mimetype.startsWith("image/")) {
                return failResponse(res, "Signature must be an image", 400);
            }
            document.signature = {
                fileName: file.originalname,
                fileUrl: file.path || file.filename,
            };
            await document.save();
        } else if (req.body.signature) {
            const base64Data = req.body.signature;
            if (!base64Data.startsWith("data:image/")) {
                return failResponse(res, "Invalid signature format", 400);
            }
            const uploaded = await cloudinary.uploader.upload(base64Data, {
                folder: "signatures",
                public_id: `signature-${Date.now()}`,
                overwrite: true
            });
            document.signature = {
                fileName: uploaded.original_filename,
                fileUrl: uploaded.secure_url
            };
            await document.save();
        }

        // ------------------- Populate and return -------------------
        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "projectName" },
            { path: "owner", select: "name email" },
            { path: "files", select: "originalName fileType s3Url" }
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
 Update document with versioning
 */
/**
 * Update document with versioning - FIXED DATE HANDLING
 */
export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        let hasChanges = false;
        let changeReason = "Document updated";
        let changedFields = [];
        let fileUpdates = false;

        // Update folder if provided
        if (req.body.folderId && mongoose.Types.ObjectId.isValid(req.body.folderId)) {
            if (document.folderId?.toString() !== req.body.folderId) {
                document.folderId = req.body.folderId;
                hasChanges = true;
                changeReason = "Folder updated";
                changedFields.push("folderId");
            }
        }

        for (const [key, value] of Object.entries(req.body)) {
            if (value === undefined || value === null || key === 'folderId') continue;

            switch (key) {
                case "metadata":
                    try {
                        const newMetadata = typeof value === "string" ? JSON.parse(value) : value;
                        const mergedMetadata = { ...document.metadata, ...newMetadata };
                        if (JSON.stringify(document.metadata) !== JSON.stringify(mergedMetadata)) {
                            document.metadata = mergedMetadata;
                            hasChanges = true;
                            changeReason = "Metadata updated";
                            changedFields.push("metadata");
                        }
                    } catch (error) {
                        console.warn("Invalid metadata format:", error.message);
                    }
                    break;

                case "tags":
                    let newTags = Array.isArray(value)
                        ? value.map(tag => tag.trim().toLowerCase()).filter(tag => tag)
                        : value.split(",").map(tag => tag.trim().toLowerCase()).filter(tag => tag);

                    if (JSON.stringify([...document.tags].sort()) !== JSON.stringify([...newTags].sort())) {
                        document.tags = newTags;
                        hasChanges = true;
                        changeReason = "Tags updated";
                        changedFields.push("tags");
                    }
                    break;

                case "compliance":
                    const newCompliance = value === "yes" || value === "true" || value === true;
                    if (document.compliance.isCompliance !== newCompliance) {
                        document.compliance.isCompliance = newCompliance;
                        hasChanges = true;
                        changeReason = "Compliance status updated";
                        changedFields.push("compliance");
                    }
                    break;

                case "expiryDate":
                    if (value && value.trim() !== '') {
                        try {
                            // Simple approach: Let MongoDB handle the date parsing
                            const newExpiry = new Date(value);

                            if (!isNaN(newExpiry.getTime())) {
                                const currentExpiry = document.compliance.expiryDate;
                                if (!currentExpiry || currentExpiry.getTime() !== newExpiry.getTime()) {
                                    document.compliance.expiryDate = newExpiry;
                                    hasChanges = true;
                                    changeReason = "Expiry date updated";
                                    changedFields.push("compliance");
                                    console.log('Expiry date updated to:', newExpiry);
                                }
                            } else {
                                console.warn("Invalid expiry date, skipping:", value);
                            }
                        } catch (error) {
                            console.warn("Expiry date error, skipping:", error.message);
                        }
                    } else if (value === '' || value === null) {
                        // Clear expiry date
                        if (document.compliance.expiryDate !== null) {
                            document.compliance.expiryDate = null;
                            hasChanges = true;
                            changeReason = "Expiry date removed";
                            changedFields.push("compliance");
                        }
                    }
                    break;

                case "documentDate":
                    if (value && value.trim() !== '') {
                        try {
                            let newDocumentDate;

                            if (value.includes('-')) {
                                // Handle DD-MM-YYYY format from frontend
                                const [d, m, y] = value.split("-");
                                if (d && m && y) {
                                    newDocumentDate = new Date(`${y}-${m}-${d}`);
                                }
                            } else if (value.includes('/')) {
                                // Handle DD/MM/YYYY format
                                const [d, m, y] = value.split("/");
                                if (d && m && y) {
                                    newDocumentDate = new Date(`${y}-${m}-${d}`);
                                }
                            } else {
                                // Handle ISO format or other formats
                                newDocumentDate = new Date(value);
                            }

                            // Validate the date
                            if (newDocumentDate && !isNaN(newDocumentDate.getTime())) {
                                const currentDocDate = document.documentDate;
                                if (!currentDocDate || currentDocDate.getTime() !== newDocumentDate.getTime()) {
                                    document.documentDate = newDocumentDate;
                                    hasChanges = true;
                                    changeReason = "Document date updated";
                                    changedFields.push("documentDate");
                                }
                            } else {
                                console.warn("Invalid document date format:", value);
                            }
                        } catch (error) {
                            console.warn("Document date parsing error:", error.message, "Value:", value);
                        }
                    }
                    break;

                case "fileIds":
                    if (value && value.length > 0) {
                        try {
                            const parsedIds = Array.isArray(value) ? value : JSON.parse(value);
                            const validIds = parsedIds.filter(id => mongoose.Types.ObjectId.isValid(id));
                            if (validIds.length > 0) {
                                await processFileUpdates(document, validIds, req.user, changedFields);
                                hasChanges = true;
                                fileUpdates = true;
                                changeReason = "Files updated";
                                changedFields.push("files");
                            }
                        } catch (error) {
                            console.warn("Invalid fileIds format:", error.message);
                        }
                    }
                    break;

                case "description":
                case "comment":
                case "link":
                case "signature":
                    // Handle these fields separately or let default case handle them
                    break;

                default:
                    if (document.schema.path(key) && document[key] !== value) {
                        document[key] = value;
                        hasChanges = true;
                        changedFields.push(key);
                    }
            }
        }

        // Handle signature
        const signatureUpdated = await handleSignatureUpdate(document, req);
        if (signatureUpdated) {
            hasChanges = true;
            changeReason = "Signature updated";
            changedFields.push("signature");
        }

        // Handle description, comment, link fields that might have been missed
        const textFields = ['description', 'comment', 'link', 'documentName', 'documentType', 'documentStatus', 'documentPriority', 'documentReference', 'documentVersion'];
        for (const field of textFields) {
            if (req.body[field] !== undefined && document[field] !== req.body[field]) {
                document[field] = req.body[field];
                hasChanges = true;
                changedFields.push(field);
            }
        }

        // Handle project, department, projectManager, documentDonor, documentVendor
        const referenceFields = ['project', 'department', 'projectManager', 'documentDonor', 'documentVendor'];
        for (const field of referenceFields) {
            if (req.body[field] !== undefined) {
                const newValue = req.body[field] === '' ? null : req.body[field];
                const currentValue = document[field]?.toString();

                if (currentValue !== newValue?.toString()) {
                    document[field] = newValue && mongoose.Types.ObjectId.isValid(newValue) ? newValue : null;
                    hasChanges = true;
                    changedFields.push(field);
                }
            }
        }

        // Save and create version history
        if (hasChanges) {
            if (fileUpdates) changeReason = "Files and content updated";

            // Bump version only if there are actual content changes (not just metadata)
            const contentFields = ['description', 'files', 'signature', 'documentName', 'documentType'];
            const hasContentChanges = changedFields.some(field => contentFields.includes(field));

            if (hasContentChanges) {
                bumpVersion(document);
            }

            await createVersionHistory(document, req.user, changeReason, changedFields);
            await document.save();

            const populatedDoc = await Document.findById(document._id)
                .populate('files')
                .populate('owner', 'name email')
                .populate('folderId', 'name')
                .populate('project', 'projectName name')
                .populate('department', 'name')
                .populate('projectManager', 'name')
                .populate('documentDonor', 'name')
                .populate('documentVendor', 'name')
                .populate('versionHistory.changedBy', 'name email');

            return successResponse(res, {
                document: populatedDoc,
                changes: changeReason,
                version: document.versioning.currentVersion.toString(),
                changedFields: changedFields
            }, "Document updated successfully");
        } else {
            const populatedDoc = await Document.findById(document._id)
                .populate('files')
                .populate('owner', 'name email')
                .populate('project', 'projectName name')
                .populate('department', 'name');

            return successResponse(res, {
                document: populatedDoc
            }, "No changes detected");
        }

    } catch (error) {
        console.error("Update document error:", error);
        return errorResponse(res, error, "Failed to update document");
    }
};


/**
 * Process file updates and versioning
 */
const processFileUpdates = async (document, fileIds, user, changedFields) => {
    for (const tempId of fileIds) {
        const tempFile = await TempFile.findById(tempId);
        if (!tempFile || tempFile.status !== "temp") continue;

        tempFile.status = "permanent";
        await tempFile.save();

        await File.updateMany(
            { document: document._id, isPrimary: true, status: "active" },
            { $set: { isPrimary: false, status: "inactive" } }
        );

        const newFile = await File.create({
            document: document._id,
            file: tempFile.s3Filename,
            s3Url: tempFile.s3Url,
            originalName: tempFile.originalName,
            version: document.versioning.currentVersion,
            uploadedBy: user._id,
            uploadedAt: new Date(),
            isPrimary: true,
            status: "active",
            mimeType: tempFile.mimeType,
            size: tempFile.size
        });

        if (!document.files.includes(newFile._id)) {
            document.files.push(newFile._id);
        }

        if (!changedFields.includes("files")) changedFields.push("files");
    }
};



/**
 * Handle signature updates
 */
const handleSignatureUpdate = async (document, req) => {
    let signatureUpdated = false;

    try {
        if (req.files?.signature?.[0]) {
            const file = req.files.signature[0];
            if (!file.mimetype.startsWith("image/")) {
                throw new Error("Signature must be an image");
            }

            document.signature = {
                fileName: file.originalname,
                fileUrl: file.path || file.filename,
                uploadedAt: new Date()
            };
            signatureUpdated = true;

        } else if (req.body.signature && req.body.signature.trim() !== '') {
            const base64Data = req.body.signature;
            if (!base64Data.startsWith("data:image/")) {
                throw new Error("Invalid signature format");
            }

            if (typeof cloudinary !== 'undefined') {
                const uploaded = await cloudinary.uploader.upload(base64Data, {
                    folder: "signatures",
                    public_id: `signature-${document._id}-${Date.now()}`,
                    overwrite: false
                });

                document.signature = {
                    fileName: uploaded.original_filename,
                    fileUrl: uploaded.secure_url,
                    uploadedAt: new Date(),
                    cloudinaryId: uploaded.public_id
                };
            } else {

                document.signature = {
                    fileName: `signature-${Date.now()}.png`,
                    fileUrl: base64Data,
                    uploadedAt: new Date()
                };
            }
            signatureUpdated = true;
        }
    } catch (error) {
        console.error("Signature update error:", error);
        throw error;
    }

    return signatureUpdated;
};

/**
 * Create version history entry
 */
const createVersionHistory = async (document, user, changes, changedFields) => {
    const snapshot = {};
    changedFields.forEach(field => {
        if (document[field] !== undefined) {
            snapshot[field] = JSON.parse(JSON.stringify(document[field])); // deep copy
        }
    });

    document.versionHistory.push({
        version: document.versioning.currentVersion,
        timestamp: new Date(),
        changedBy: user._id,
        changes,
        snapshot
    });

    if (document.versionHistory.length > 50) {
        document.versionHistory = document.versionHistory.slice(-50);
    }
};
/**
 * Restore to specific version
 */
export const restoreVersion = async (req, res) => {
    const { id, version } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
    }

    if (!version) {
        return res.status(400).json({ message: "Version is required" });
    }

    try {
        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Find the snapshot in versionHistory
        const targetVersion = document.versionHistory.find(v =>
            v.version.toString() === version.toString()
        );

        if (!targetVersion) {
            return res.status(404).json({ message: "Version not found in history" });
        }

        // Restore document from snapshot
        const snapshot = targetVersion.snapshot;
        Object.keys(snapshot).forEach(key => {
            document[key] = snapshot[key];
        });

        // Update versioning
        document.versioning.previousVersion = document.versioning.currentVersion;
        document.versioning.currentVersion = mongoose.Types.Decimal128.fromString(version.toString());
        document.versioning.nextVersion = null;

        // Save document
        await document.save();

        res.status(200).json({
            message: `Document restored to version ${version}`,
            document,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", error });
    }
};



/**
 * View specific version of document
 */
export const viewVersion = async (req, res) => {
    try {
        const { id, version } = req.params;

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        const versionData = document.versioning.versionHistory.find(
            v => v.version === parseFloat(version)
        );

        if (!versionData) {
            return failResponse(res, `Version ${version} not found`, 404);
        }

        // Get files associated with this version
        const versionFiles = await File.find({
            _id: { $in: versionData.snapshot.files || [] }
        }).select('originalName s3Url version uploadedAt');

        const versionDocument = {
            _id: document._id,
            ...versionData.snapshot,
            version: versionData.version,
            versionInfo: {
                timestamp: versionData.timestamp,
                changedBy: versionData.changedBy,
                changes: versionData.changes,
                changesDetail: versionData.changesDetail
            },
            files: versionFiles
        };

        await Document.populate(versionDocument, [
            { path: 'department', select: 'name' },
            { path: 'project', select: 'projectName' },
            { path: 'projectManager', select: 'name email' },
            { path: 'documentDonor', select: 'name email' },
            { path: 'documentVendor', select: 'name email' },
            { path: 'versionInfo.changedBy', select: 'name email' }
        ]);

        return successResponse(res, {
            document: versionDocument,
            isHistorical: true,
            currentVersion: document.versioning.currentVersion
        }, `Viewing version ${version}`);

    } catch (error) {
        logger.error("View version error:", error);
        return errorResponse(res, error, "Failed to retrieve version");
    }
};


/**
 * Get complete version history for a document
 */
export const getVersionHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findById(id)
            .populate('versionHistory.changedBy', 'name email')
            .select('versioning metadata.mainHeading description versionHistory');

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        const enhancedHistory = document.versionHistory.map((version, index, arr) => {
            const previousVersion = index > 0 ? arr[index - 1].version?.toString() : null;
            const nextVersion = index < arr.length - 1 ? arr[index + 1].version?.toString() : null;

            return {
                previousVersion,
                version: version.version?.toString(),
                nextVersion,
                timestamp: version.timestamp,
                changedBy: version.changedBy,
                changes: version.changes,
                files: version.file ? [{ _id: version.file }] : [],
                isCurrent: version.version?.toString() === document.versioning.currentVersion?.toString(),
                snapshotPreview: {
                    description: version.snapshot?.description,
                    mainHeading: version.snapshot?.metadata?.mainHeading,
                    tags: version.snapshot?.tags
                }
            };
        });

        return successResponse(res, {
            documentId: document._id,
            documentName: document.metadata?.mainHeading || document.description || 'Untitled',
            currentVersion: document.versioning.currentVersion?.toString(),
            versionHistory: enhancedHistory,
            totalVersions: enhancedHistory.length
        }, "Version history retrieved successfully");

    } catch (error) {
        console.error("Get version history error:", error);
        return errorResponse(res, error, "Failed to retrieve version history");
    }
};


export const viewDocumentVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const { version } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid document ID" });
        }

        if (!version) {
            return res.status(400).json({ message: "Version query parameter is required" });
        }

        const document = await Document.findById(id)
            .select("description project department folderId projectManager documentDonor documentVendor owner status tags metadata compliance files documentDate link sharedWithUsers comment versioning versionHistory createdAt updatedAt ")
            .populate("versionHistory.changedBy", "name email")
            .populate("projectManager", "name email")
            .populate("owner", "name email")
            .populate("project", "projectName")
            .populate("department", "name")
            .populate("folderId", "name")
            .populate("documentDonor", "name")
            .populate("documentVendor", "name")
            .populate("sharedWithUsers", "name email")
            .populate("files", "originalName")
            .lean();

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const Decimal128 = mongoose.Types.Decimal128;
        const requestedVersion = Decimal128.fromString(version);

        const versionItem = document.versionHistory.find(v =>
            v.version.toString() === requestedVersion.toString()
        );

        if (!versionItem) {
            return res.status(404).json({ message: `Version ${version} not found` });
        }

        const snapshot = versionItem.snapshot || {};
        const documentAtVersion = _.cloneDeep(document);
        _.merge(documentAtVersion, snapshot);

        const response = {
            version: versionItem.version.toString(),
            timestamp: versionItem.timestamp,
            changedBy: versionItem.changedBy,
            changes: versionItem.changes,
            document: documentAtVersion
        };

        return res.json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * Soft Delete document (Recycle Bin)
 */
export const softDeleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id);
        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        if (document.owner.toString() !== req.user._id.toString()) {
            return failResponse(res, "Only the owner can delete this document", 403);
        }

        const updatedDocument = await Document.findByIdAndUpdate(
            id,
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        );

        return successResponse(res, { document: updatedDocument }, "Document moved to recycle-bin");
    } catch (error) {
        return errorResponse(res, error, "Failed to delete document");
    }
};


/**
 * Delete document(s) permanently
 * 1️⃣ Single delete: via query ?id=<documentId>
 * 2️⃣ Multiple delete: via body { ids: [] }
 * 3️⃣ Empty trash: via query ?empty=true
 */
export const deleteDocument = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Please provide an array of document IDs to delete."
            });
        }

        const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

        // Fetch all dependent IDs in one query
        const docs = await Document.aggregate([
            { $match: { _id: { $in: objectIds } } },
            { $project: { files: 1, approvalHistory: 1, versionFiles: "$versionHistory.file" } }
        ]);

        if (!docs.length) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "No documents found for the provided IDs."
            });
        }

        // Flatten all dependent IDs
        const fileIds = docs.flatMap(d => [...(d.files || []), ...(d.versionFiles || [])]);
        const approvalIds = docs.flatMap(d => d.approvalHistory || []);


        const deletions = [];

        if (fileIds.length) deletions.push(File.deleteMany({ _id: { $in: fileIds } }).session(session));
        if (approvalIds.length) deletions.push(Approval.deleteMany({ _id: { $in: approvalIds } }).session(session));
        deletions.push(Document.deleteMany({ _id: { $in: objectIds } }).session(session));

        for (const op of deletions) {
            await op;
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: `${docs.length} document(s) and their dependencies permanently deleted.`
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error deleting documents permanently:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting documents.",
            error: error.message
        });
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
        const userId = req.user._id;
        const {
            accessLevel = "view",
            duration = "lifetime",
            customEnd,
            generalAccess = false,
            userIds = []
        } = req.body;

        // --- Validate IDs ---
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid document or user ID" });
        }

        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        const isOwner = doc.owner.toString() === userId.toString();
        const existingEditAccess = await SharedWith.findOne({ document: id, user: userId, accessLevel: "edit" });

        if (!isOwner && !existingEditAccess) {
            return res.status(403).json({ success: false, message: "You don't have permission to share this document" });
        }

        // --- Determine expiration date ---
        const now = new Date();
        let expiresAt = null;
        let used;

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
                if (!customEnd)
                    return res.status(400).json({ success: false, message: "Custom end date required" });
                expiresAt = new Date(customEnd);
                if (expiresAt <= now)
                    return res.status(400).json({ success: false, message: "Custom end date must be in the future" });
                break;
            case "onetime":
                used = false;
                break;
            case "lifetime":
                expiresAt = new Date(now);
                expiresAt.setFullYear(expiresAt.getFullYear() + 50);
                break;
            default:
                expiresAt = null;
        }


        const finalAccessLevel = accessLevel;
        const generalRole = (accessLevel === "edit") ? "editor" : "viewer";

        const shareData = {
            accessLevel: finalAccessLevel,
            duration,
            expiresAt,
            generalAccess,
            generalRole
        };
        if (used !== undefined) shareData.used = used;

        let updatedShares = [];


        if (generalAccess) {
            const generalShare = await SharedWith.findOneAndUpdate(
                { document: id, generalAccess: true },
                shareData,
                { upsert: true, new: true }
            );
            if (generalShare) updatedShares.push(generalShare);
        }

        // --- Handle user-specific shares ---
        if (userIds.length) {
            const validUserIds = userIds.filter(uid => mongoose.Types.ObjectId.isValid(uid));

            if (validUserIds.length) {
                const bulkOps = validUserIds.map(uid => ({
                    updateOne: {
                        filter: { document: id, user: uid },
                        update: { $set: shareData, $setOnInsert: { document: id, user: uid } },
                        upsert: true
                    }
                }));

                await SharedWith.bulkWrite(bulkOps);

                const userShares = await SharedWith.find({ document: id, user: { $in: validUserIds } });
                updatedShares = updatedShares.concat(userShares);
            }
        }

        if (!updatedShares.length) {
            return res.status(404).json({ success: false, message: "No share records found or created" });
        }

        return res.json({ success: true, message: "Share data updated successfully", data: updatedShares });
    } catch (err) {
        console.error("Update document share error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * Update user access level permission
 * PUT /api/documents/:documentId/permissions
 */
export const bulkPermissionUpdate = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { users } = req.body; // [{ userId, accessLevel, canDownload }]

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: "Invalid document ID" });
        }

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ success: false, message: "No users provided" });
        }

        const operations = [];
        const invalidIds = [];

        users.forEach(user => {
            const { userId, accessLevel, canDownload } = user;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                invalidIds.push(userId);
                return;
            }

            const updateFields = {};
            if (accessLevel) updateFields.accessLevel = accessLevel;
            if (canDownload !== undefined) updateFields.canDownload = canDownload;

            operations.push({
                updateOne: {
                    filter: { document: documentId, user: userId },
                    update: { $set: updateFields }
                }
            });
        });

        if (operations.length === 0) {
            return res.status(400).json({ success: false, message: "No valid users to update", invalidIds });
        }

        const bulkResult = await SharedWith.bulkWrite(operations);

        res.json({
            success: true,
            message: "Bulk permission update completed",
            bulkResult,
            invalidIds
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * Update user access level or download permission
 * PUT /api/documents/share/:documentId
 */
export const updateSharedUser = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userId, accessLevel, canDownload } = req.body;

        if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const share = await SharedWith.findOne({ document: documentId, user: userId });
        if (!share) return res.status(404).json({ success: false, message: "User not found in shared list" });

        if (accessLevel) share.accessLevel = accessLevel;
        if (canDownload !== undefined) share.canDownload = canDownload;

        await share.save();

        res.json({ success: true, message: "User access updated successfully", data: share });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * Remove a user from shared list
 * DELETE /api/documents/share/:documentId
 */
export const removeSharedUser = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        await SharedWith.deleteOne({ document: documentId, user: userId });
        await Document.findByIdAndUpdate(documentId, { $pull: { sharedWithUsers: userId } });

        res.json({ success: true, message: "User removed from shared list" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * @desc    Get list of users a document is shared with
 * @route   GET /api/documents/:id/shared-users
 * @access  Private
 */
export const getSharedUsers = async (req, res) => {
    try {
        const { documentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: "Invalid document ID" });
        }

        // Fetch the document and populate the owner
        const document = await Document.findById(documentId).populate("owner", "name email");
        if (!document) return res.status(404).json({ success: false, message: "Document not found" });

        // Fetch shared users
        const shares = await SharedWith.find({ document: documentId, inviteStatus: 'accepted' })
            .populate("user", "name email");

        const sharedUsers = shares.map(sw => ({
            userId: sw.user._id,
            name: sw.user.name,
            email: sw.user.email,
            accessLevel: sw.accessLevel,
            canDownload: sw.canDownload,
        }));

        // Include owner
        const ownerData = {
            userId: document.owner._id,
            name: document.owner.name,
            email: document.owner.email,
            accessLevel: "owner",
            canDownload: true
        };

        const data = [ownerData, ...sharedUsers];

        return res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const inviteUser = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userEmail, accessLevel = "view", duration = "oneweek", customEnd } = req.body;
        const inviterId = req.session.user?._id;

        if (!inviterId) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!userEmail) return res.status(400).json({ success: false, message: "User email is required" });
        if (!mongoose.Types.ObjectId.isValid(documentId)) return res.status(400).json({ success: false, message: "Invalid document ID" });

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        // Only owner or editor can share
        const isOwner = doc.owner.toString() === inviterId.toString();
        const existingShare = await SharedWith.findOne({ document: documentId, user: inviterId, accessLevel: "edit" });
        if (!isOwner && !existingShare) {
            return res.status(403).json({ success: false, message: "No permission to share this document" });
        }

        // Find or create user
        let user = await User.findOne({ email: userEmail.toLowerCase().trim() });
        if (!user) {
            user = new User({
                email: userEmail,
                name: userEmail.split("@")[0],
                password: Math.random().toString(36).slice(-8),
                isTemporary: true,
            });
            await user.save();
        }

        // Calculate expiry
        const now = new Date();
        let expiresAt = null;
        switch (duration) {
            case "oneday": expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
            case "oneweek": expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case "onemonth": expiresAt = new Date(now.setMonth(now.getMonth() + 1)); break;
            case "lifetime": expiresAt = new Date(now); expiresAt.setFullYear(expiresAt.getFullYear() + 50); break;
            case "custom": if (customEnd) expiresAt = new Date(customEnd); break;
        }
        // Create or update share entry
        const share = await SharedWith.findOneAndUpdate(
            { document: documentId, user: user._id },
            { accessLevel, expiresAt, duration, inviteStatus: "pending", generalAccess: true },
            { new: true, upsert: true }
        );

        await Document.findByIdAndUpdate(documentId, { $addToSet: { sharedWithUsers: user._id } });

        // Link using session-based route
        const inviteLink = `${API_CONFIG.baseUrl}/api/documents/${documentId}/invite/${user._id}/auto-accept`;

        await sendEmail({
            to: userEmail,
            subject: "Document Access Invitation - E-Sangrah",
            html: inviteUserTemplate({
                fileName: doc.metadata?.fileName,
                accessLevel,
                expiresAt,
                inviteLink
            })
        });
        res.json({ success: true, message: "Invite sent successfully" });

    } catch (err) {
        console.error("inviteUser error:", err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};

export const autoAcceptInvite = async (req, res) => {
    try {
        const { documentId, userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send(alertRedirectTemplate('Invalid link.', '/documents/list'));
        }

        const share = await SharedWith.findOne({ document: documentId, user: userId }).populate("document");
        if (!share) return res.status(404).send(alertRedirectTemplate('You are removed from invitation list.', '/documents/list'));

        if (share.expiresAt && new Date() > share.expiresAt) {
            return res.send(accessExpiredTemplate(documentId));
        }

        if (share.inviteStatus === "rejected") {
            return res.status(403).send(alertRedirectTemplate('This invitation was rejected.', '/documents/list'));
        }

        if (share.inviteStatus !== "accepted") {
            share.inviteStatus = "accepted";
            share.acceptedAt = new Date();
            await share.save();
        }

        await Document.findByIdAndUpdate(documentId, { $addToSet: { sharedWithUsers: userId } });
        req.session.user = await User.findById(userId);

        const fileId = share.document?.files?.[0]?._id || "default";
        const viewDocLink = generateShareLink(documentId, fileId);
        return res.redirect(viewDocLink);

    } catch (err) {
        console.error("autoAcceptInvite error:", err);
        return res.status(500).send(alertRedirectTemplate('Something went wrong.', '/documents/list'));
    }
};

/**
 * RE-REQUEST ACCESS
 * Allows a user to request new access after expiration.
 */
// export const requestAccessAgain = async (req, res) => {
//     try {
//         const { documentId } = req.params;
//         const userId = req.session.user?._id;
//         if (!userId) return res.status(401).json({ success: false, message: "Not logged in" });

//         const doc = await Document.findById(documentId).populate("owner", "email name");
//         if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

//         const owner = doc.owner;
//         if (!owner?.email) return res.status(400).json({ success: false, message: "Owner email not found" });

//         // Create a JWT token for owner approval
//         const token = jwt.sign({
//             docId: documentId,
//             userId,
//             action: "approveAccess"
//         }, process.env.JWT_SECRET || "supersecretkey", { expiresIn: "3d" });

//         const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
//         const approvalLink = `${baseUrl}/documents/approve-access/${token}`;

//         // Send email to owner
//         await sendEmail({
//             to: owner.email,
//             subject: `Access Request for Document: ${doc.metadata?.fileName || 'Untitled'}`,
//             html: `
//                 <p>${req.session.user.name} (${req.session.user.email}) requested access to <strong>${doc.metadata?.fileName || 'your document'}</strong>.</p>
//                 <p>Click below to approve and set access duration:</p>
//                 <a href="${approvalLink}" style="padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Approve Access</a>
//             `
//         });

//         res.json({ success: true, message: `Request sent to ${owner.name || owner.email}` });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: "Server error: " + err.message });
//     }
// };

export const requestAccessAgain = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { email } = req.body; // Only email is provided for external users
        const userId = req.session.user?._id;

        if (!userId && !email) {
            return res.status(401).json({ success: false, message: "Not logged in or email not provided" });
        }

        const doc = await Document.findById(documentId).populate("owner", "email name");
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        const owner = doc.owner;
        if (!owner?.email) return res.status(400).json({ success: false, message: "Owner email not found" });

        // Check if user exists
        let user = null;
        let isExternal = false;
        let userName = "";

        if (userId) {
            user = await User.findById(userId);
            userName = user?.name;
        } else if (email) {
            user = await User.findOne({ email });
            if (user) {
                isExternal = false;
                userName = user.name;
            } else {
                isExternal = true;
                userName = ""; // external, name unknown
            }
        }

        // Create JWT token for owner approval
        const token = jwt.sign({
            docId: documentId,
            userId: user?._id || null,
            userEmail: email || user?.email,
            userName: userName,
            action: "approveAccess"
        }, API_CONFIG.ACCESS_GRANT_SECRET || "supersecretkey", { expiresIn: "3d" });

        const baseUrl = API_CONFIG.baseUrl || "http://localhost:5000";
        const approvalLink = `${baseUrl}/documents/approve-access/${token}`;

        // Send email to owner
        await sendEmail({
            to: owner.email,
            subject: `Access Request for Document: ${doc.metadata?.fileName || 'Untitled'}`,
            html: `
                <p>${userName || email} (${email || user?.email}) requested access to <strong>${doc.metadata?.fileName || 'your document'}</strong>.</p>
                <p>Click below to approve and set access duration:</p>
                <a href="${approvalLink}" style="padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Approve Access</a>
            `
        });

        // Log request in PermissionLogs
        await PermissionLogs.findOneAndUpdate(
            {
                document: documentId,
                "user.email": email || user?.email
            },
            {
                document: documentId,
                owner: owner._id,
                user: { username: userName, email: email || user?.email },
                access: "view",
                isExternal,
                requestStatus: "pending",
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: `Request sent to ${owner.name || owner.email}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
};


// export const grantAccessViaToken = async (req, res) => {
//     try {
//         const { token } = req.params;
//         const { duration } = req.body;

//         const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
//         const { docId, userId, action } = decoded;
//         if (action !== "approveAccess") return res.status(403).send("Invalid action");

//         const doc = await Document.findById(docId).populate("owner");
//         if (!doc) return res.status(404).send("Document not found");

//         // Calculate expiration
//         const now = new Date();
//         let expiresAt;
//         switch (duration) {
//             case "oneday": expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
//             case "oneweek": expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
//             case "onemonth": expiresAt = new Date(now); expiresAt.setMonth(expiresAt.getMonth() + 1); break;
//             case "lifetime": expiresAt = new Date(now); expiresAt.setFullYear(expiresAt.getFullYear() + 50); break;
//             default: expiresAt = null;
//         }

//         // Update or create SharedWith
//         await SharedWith.findOneAndUpdate(
//             { document: docId, user: userId },
//             { accessLevel: "view", duration, expiresAt, generalAccess: true },
//             { new: true, upsert: true }
//         );

//         // Notify user
//         const user = await User.findById(userId);
//         await sendEmail({
//             to: user.email,
//             subject: "Access Granted",
//             html: `<p>Your access to "${doc.metadata?.fileName}" has been granted for ${duration}.</p>`
//         });

//         res.send(`<h2>Access granted to ${user.name}</h2><p>Email notification sent.</p>`);

//     } catch (err) {
//         res.send(`<h2>Error</h2><p>${err.message}</p>`);
//     }
// };

export const grantAccessViaToken = async (req, res) => {
    try {
        const { token } = req.params;
        const { duration } = req.body;

        const decoded = jwt.verify(token, API_CONFIG.ACCESS_GRANT_SECRET || "supersecretkey");
        const { docId, userId, userEmail, userName, action } = decoded;

        if (action !== "approveAccess") return res.status(403).send("Invalid action");

        const doc = await Document.findById(docId).populate("owner");
        if (!doc) return res.status(404).send("Document not found");

        // Calculate expiration
        const now = new Date();
        let expiresAt;
        switch (duration) {
            case "oneday": expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
            case "oneweek": expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case "onemonth": expiresAt = new Date(now); expiresAt.setMonth(expiresAt.getMonth() + 1); break;
            case "lifetime": expiresAt = new Date(now); expiresAt.setFullYear(expiresAt.getFullYear() + 50); break;
            default: expiresAt = null;
        }

        // Check if user exists (internal) or external
        let user = null;
        let isExternal = false;
        if (userId) {
            user = await User.findById(userId);
            isExternal = false;
        } else {
            user = await User.findOne({ email: userEmail });
            if (!user) isExternal = true;
        }

        if (!isExternal) {
            // Internal user → update or create SharedWith
            await SharedWith.findOneAndUpdate(
                { document: docId, user: user._id },
                { accessLevel: "view", duration, expiresAt, generalAccess: true },
                { new: true, upsert: true }
            );
        }

        // Update PermissionLogs as approved
        await PermissionLogs.findOneAndUpdate(
            { document: docId, "user.email": userEmail },
            {
                approved: true,
                approvedBy: doc.owner._id,
                isExternal
            },
            { new: true }
        );

        // Send email notification only if internal
        if (!isExternal && user) {
            await sendEmail({
                to: user.email,
                subject: "Access Granted",
                html: `<p>Your access to "${doc.metadata?.fileName}" has been granted for ${duration}.</p>`
            });
        }

        res.send(`<h2>Access granted to ${userName || userEmail}</h2><p>${isExternal ? 'External user logged in PermissionLogs only.' : 'Email notification sent.'}</p>`);

    } catch (err) {
        res.send(`<h2>Error</h2><p>${err.message}</p>`);
    }
};

export const generateShareableLink = async (req, res) => {
    const { documentId, fileId } = req.params;
    try {
        const link = await generateShareLink(documentId, fileId);
        res.json({ success: true, link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to generate share link' });
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

// Upload new version
export const uploadDocumentVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findById(id);
        if (!document) return failResponse(res, "Document not found", 404);

        const fileData = {
            file: req.body.fileUrl,
            s3Url: req.body.s3Url,
            originalName: req.body.originalName,
            hash: req.body.hash
        };

        await document.addNewVersion(fileData, req.user._id);
        return successResponse(res, { document }, "New version uploaded successfully");
    } catch (err) {
        return errorResponse(res, err, "Failed to upload new version");
    }
};


/**
 * Get document versions
 */
export const getDocumentVersions = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return failResponse(res, "Invalid document ID", 400);
        }

        const document = await Document.findById(id)
            .populate("files.uploadedBy", "firstName lastName email")
            .select("files currentVersion");

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Group files by version and include status
        const versions = document.files.map(file => ({
            version: file.version,
            file: file.file,
            originalName: file.originalName,
            uploadedBy: file.uploadedBy,
            uploadedAt: file.uploadedAt,
            isPrimary: file.isPrimary,
            status: file.status,
            hash: file.hash
        })).sort((a, b) => b.version - a.version);

        return successResponse(res, {
            versions,
            currentVersion: document.currentVersion
        }, "Document versions retrieved successfully");

    } catch (error) {
        logger.error("Error fetching document versions:", error);
        return errorResponse(res, error, "Failed to retrieve document versions");
    }
};

export const getDocumentApprovalsPage = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Get document with populated data
        const document = await Document.findById(id)
            .populate('owner', 'name email designation')
            .populate('project', 'name')
            .populate('department', 'name')
            .populate('projectManager', 'name designation')
            .populate('documentDonor', 'name designation')
            .populate('documentVendor', 'name designation')
            .populate({
                path: 'files',
                select: 'fileName originalName size url mimetype'
            });

        if (!document) {
            return res.status(404).render('error', {
                message: 'Document not found'
            });
        }

        const approvals = await Approval.find({ document: id })
            .populate('approver', 'name designation email')
            .sort({ level: 1 });
        if (approvals.length === 0) {
            const defaultApprovers = await createDefaultApprovalWorkflow(id, document);
            approvals.push(...defaultApprovers);
        }

        // Calculate approval progress
        const totalApprovals = approvals.length;
        const completedApprovals = approvals.filter(a =>
            a.status === 'Approved' || a.status === 'Rejected'
        ).length;
        const progressPercentage = totalApprovals > 0 ?
            (completedApprovals / totalApprovals) * 100 : 0;

        // Format dates for display
        const formatDate = (date) => {
            if (!date) return null;
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        // Get file size for display
        const getFileSize = () => {
            if (document.files && document.files.length > 0) {
                const sizeInBytes = document.files[0].size;
                const sizeInKB = Math.round(sizeInBytes / 1024);
                return `${sizeInKB}KB`;
            }
            return 'N/A';
        };

        res.render('pages/employee/trackStatus', {
            document: {
                ...document.toObject(),
                formattedDate: formatDate(document.documentDate || document.createdAt),
                fileSize: getFileSize()
            },
            approvals: approvals.map(approval => ({
                ...approval.toObject(),
                formattedApprovedOn: formatDate(approval.approvedOn),
                isCurrentUser: user && approval.approver._id.toString() === user.id
            })),
            progress: {
                percentage: Math.round(progressPercentage),
                completed: completedApprovals,
                total: totalApprovals
            },
            user: user,
            currentUser: user
        });

    } catch (error) {
        console.error('Error loading document approvals:', error);
        res.status(500).render('error', {
            message: 'Error loading document approvals'
        });
    }
};


const createDefaultApprovalWorkflow = async (documentId, document) => {
    try {
        const teamLeaders = await User.find({ designation: 'Team Leader' }).limit(1);
        const projectLeaders = await User.find({ designation: 'Project Leader' }).limit(1);
        const managers = await User.find({ designation: 'Manager' }).limit(1);
        const ceos = await User.find({ designation: 'CEO' }).limit(1);

        const approvalWorkflow = [];
        let level = 1;

        // Team Leader approval
        if (teamLeaders.length > 0) {
            approvalWorkflow.push({
                document: documentId,
                approver: teamLeaders[0]._id,
                level: level++,
                designation: 'Team Leader',
                status: 'Pending'
            });
        }

        if (projectLeaders.length > 0) {
            approvalWorkflow.push({
                document: documentId,
                approver: projectLeaders[0]._id,
                level: level++,
                designation: 'Project Leader',
                status: 'Pending'
            });
        }

        if (managers.length > 0) {
            approvalWorkflow.push({
                document: documentId,
                approver: managers[0]._id,
                level: level++,
                designation: 'Manager',
                status: 'Pending'
            });
        }

        if (ceos.length > 0) {
            approvalWorkflow.push({
                document: documentId,
                approver: ceos[0]._id,
                level: level++,
                designation: 'CEO',
                status: 'Pending'
            });
        }


        const createdApprovals = await Approval.insertMany(approvalWorkflow);

        return await Approval.find({ document: documentId })
            .populate('approver', 'name designation email')
            .sort({ level: 1 });

    } catch (error) {
        console.error('Error creating default approval workflow:', error);
        return [];
    }
};

export const updateApprovalStatus = async (req, res) => {
    try {
        const { approver } = req.params;
        const { status, remark } = req.body;
        const userId = req.user.id;
        const approval = await Approval.find(approver).populate('document');

        if (!approval) return res.status(404).json({ error: 'Approval not found' });

        // Approver check
        if (approval.approver.toString() !== userId)
            return res.status(403).json({ error: 'Not authorized to approve this document' });

        // Previous approvals check
        const previousApprovals = await Approval.find({
            document: approval.document._id,
            level: { $lt: approval.level }
        });
        const pendingPrevious = previousApprovals.some(a => a.status === 'Pending');
        if (pendingPrevious) return res.status(400).json({ error: 'Previous approvals are still pending' });

        // Update approval
        approval.status = status;
        approval.remark = remark || '';
        approval.approvedOn = status === 'Approved' ? new Date() : null;
        await approval.save();

        // Update document status
        const allApprovals = await Approval.find({ document: approval.document._id });
        const allApproved = allApprovals.every(a => a.status === 'Approved');
        const anyRejected = allApprovals.some(a => a.status === 'Rejected');

        let documentStatus = 'Pending';
        if (allApproved) documentStatus = 'Approved';
        else if (anyRejected) documentStatus = 'Rejected';

        await Document.findByIdAndUpdate(approval.document._id, { status: documentStatus });

        const updatedApprovals = await Approval.find({ document: approval.document._id })
            .populate('approver', 'name designation email')
            .sort({ level: 1 });

        res.json({
            message: 'Approval updated successfully',
            approval: updatedApprovals.find(a => a._id.toString() === approver),
            documentStatus
        });


    } catch (error) {
        console.error('Error updating approval:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getApprovals = async (req, res) => {
    try {
        const { documentId } = req.params;

        const approvals = await Approval.find({ document: documentId })
            .populate({
                path: "approver",
                select: "name email phone_number profile_type userDetails",
                populate: [
                    {
                        path: "userDetails.designation",
                        model: "Designation",
                        select: "name"
                    },
                    {
                        path: "userDetails.department",
                        model: "Department",
                        select: "name"
                    }
                ]
            })
            .sort({ level: 1 });

        if (!approvals || approvals.length === 0) {
            return res.status(404).json({ message: "No approvals found" });
        }

        const document = await Document.findById(documentId)
            .populate("project department folderId projectManager documentDonor documentVendor owner files")
            .populate({
                path: "approvalHistory",
                populate: {
                    path: "approver",
                    model: "User",
                    populate: {
                        path: "userDetails.designation",
                        model: "Designation",
                        select: "name"
                    }
                }
            })
            .populate({
                path: "versionHistory.changedBy",
                model: "User"
            })
            .lean();

        res.json({ document, approvals });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};


export const createApprovalRequest = async (req, res) => {
    try {
        // Trim and validate IDs
        const documentId = req.params.documentId?.trim();
        const { approverId: rawApproverId, level, dueDate, remark, designation: rawDesignation } = req.body;

        const approverId = rawApproverId?.trim();
        const designation = rawDesignation?.trim();

        // Validate required fields
        if (!documentId || !approverId || level == null) {
            return res.status(400).json({
                error: "Missing required fields: documentId, approverId, or level"
            });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ error: "Invalid documentId" });
        }
        if (!mongoose.Types.ObjectId.isValid(approverId)) {
            return res.status(400).json({ error: "Invalid approverId" });
        }
        if (designation && !mongoose.Types.ObjectId.isValid(designation)) {
            return res.status(400).json({ error: "Invalid designation" });
        }

        // Check if document exists
        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Check if approval already exists for same level and approver
        const existingApproval = await Approval.findOne({ document: documentId, approver: approverId, level });
        if (existingApproval) {
            return res.status(400).json({ error: "Approval request already exists for this approver and level" });
        }

        // Create approval request
        const approval = await Approval.create({
            document: documentId,
            approver: approverId,
            level,
            designation: designation || null,
            status: "Pending",
            remark: remark?.trim() || "",
            dueDate: dueDate ? new Date(dueDate) : null
        });

        // Add approval to document's approval history
        document.approvalHistory = document.approvalHistory || [];
        document.approvalHistory.push(approval._id);
        await document.save();

        // Respond success
        res.status(201).json({
            success: true,
            message: "Approval request created successfully",
            approval: {
                id: approval._id,
                document: approval.document,
                approver: approval.approver,
                level: approval.level,
                status: approval.status,
                remark: approval.remark,
                dueDate: approval.dueDate
            }
        });

    } catch (error) {
        console.error("Error creating approval request:", error);
        res.status(500).json({ error: "Internal server error creating approval request" });
    }
};