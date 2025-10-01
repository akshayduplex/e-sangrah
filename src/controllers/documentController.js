// controllers/documentController.js
import mongoose from "mongoose";
import Document from "../models/Document.js";
import { errorResponse, successResponse, failResponse } from "../utils/responseHandler.js";
import TempFile from "../models/tempFile.js";
import Notification from "../models/notification.js";
import { cloudinary } from "../middlewares/fileUploads.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../services/emailService.js";
import User from "../models/User.js";
import Designation from "../models/Designation.js";

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
        console.log("Editing document ID:", id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).render("pages/error", {
                title: "Error",
                message: "Invalid document ID",
            });
        }

        const document = await Document.findById(id)
            .populate("department", "name _id")
            .populate("project", "projectName _id")
            .populate("projectManager", "name _id")
            .populate("owner", "name _id")
            .populate("files")
            .lean();

        if (!document) {
            return res.status(404).render("pages/error", {
                title: "Error",
                message: "Document not found",
            });
        }

        console.log("Document found:", document._id);

        res.render("pages/document/add-document", {
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

//API Controllers


/**
 * Get all documents with filtering, pagination, and search
 */
export const getDocuments = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, department, project, owner, tags, category, date, sortBy = "createdAt", sortOrder = "desc", isCompliance } = req.query;

        const filter = {};

        // Text search - IMPROVED: More comprehensive search
        if (search && search.trim() !== "") {
            const safeSearch = search.trim();
            filter.$or = [
                { "metadata.fileName": { $regex: safeSearch, $options: "i" } },
                { "metadata.fileDescription": { $regex: safeSearch, $options: "i" } },
                { "metadata.mainHeading": { $regex: safeSearch, $options: "i" } },
                { description: { $regex: safeSearch, $options: "i" } },
                { tags: { $in: [new RegExp(safeSearch, "i")] } },
                { "files.originalName": { $regex: safeSearch, $options: "i" } }, // Search in file names
                { remark: { $regex: safeSearch, $options: "i" } } // Search in remarks
            ];
        }

        // ... rest of your existing backend code remains the same
        // Helper function to handle array conversion
        const toArray = val => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') return val.split(',');
            return [val];
        };

        // Status filter
        if (status) {
            const statusArray = toArray(status);
            filter.status = statusArray.length === 1 ? statusArray[0] : { $in: statusArray };
        }
        if (isCompliance !== undefined) {
            filter["compliance.isCompliance"] = isCompliance === 'true' || isCompliance === true;
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
            const projectArray = toArray(project).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (projectArray.length > 0) {
                filter.project = projectArray.length === 1 ? projectArray[0] : { $in: projectArray };
            }
        }

        // Owner filter
        if (owner) {
            const ownerArray = toArray(owner).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (ownerArray.length > 0) {
                filter.owner = ownerArray.length === 1 ? ownerArray[0] : { $in: ownerArray };
            }
        }

        // Tags filter
        if (tags) {
            const tagsArray = toArray(tags);
            filter.tags = { $in: tagsArray.map(tag => new RegExp(tag, "i")) };
        }

        // Category filter
        if (category) filter.category = category;

        // Compliance filter
        if (isCompliance !== undefined) {
            filter["compliance.isCompliance"] = isCompliance === 'true' || isCompliance === true;
        }

        // Date filter
        if (date) {
            const [day, month, year] = date.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);

            if (!isNaN(selectedDate.getTime())) {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(nextDate.getDate() + 1);

                filter.createdAt = {
                    $gte: selectedDate,
                    $lt: nextDate
                };
            }
        }

        // Sorting
        const sort = {};
        const allowedSortFields = ["createdAt", "updatedAt", "metadata.fileName", "status"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        sort[sortField] = sortOrder === "desc" ? -1 : 1;

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("project", "projectName")
            .populate("owner", "name")
            .populate("documentDonor", "name")
            .populate("documentVendor", "name")
            .populate("projectManager", "name")
            .populate("folderId", "name")
            .populate({
                path: "sharedWith.user",
                select: "name"
            })
            .sort(sort)
            .select("metadata signature description documentVendor documentDonor project department owner status tags files link createdAt updatedAt sharedWith remark compliance")
            .skip(skip)
            .limit(limitNum);

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
            .populate("owner", "name email")
            .populate("projectManager", "name email")
            // .populate("department", "name")
            .populate("sharedWith.user", "name email")
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
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));

        }
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
            project: project || null,
            department,
            projectManager: projectManager || null,
            documentDonor: documentDonor || null,
            documentVendor: documentVendor || null,
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
// export const updateDocument = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const document = await Document.findById(id);
//         if (!document) return failResponse(res, "Document not found", 404);

//         // Update folder if provided
//         if (req.body.folderId && mongoose.Types.ObjectId.isValid(req.body.folderId)) {
//             document.folderId = req.body.folderId;
//         }

//         const {
//             projectName,
//             department,
//             projectManager,
//             documentDate,
//             tags,
//             metadata,
//             description,
//             compliance,
//             expiryDate,
//             comment,
//             link,
//             fileIds
//         } = req.body;

//         // Parse metadata
//         let parsedMetadata = {};
//         if (metadata) {
//             try { parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata; }
//             catch (err) { logger.warn("Invalid metadata", err); }
//         }

//         // Parse tags
//         const parsedTags = tags ? tags.split(",").map(tag => tag.trim()) : [];

//         // Update basic fields
//         document.project = projectName || document.project;
//         document.department = department || document.department;
//         document.projectManager = projectManager || document.projectManager;
//         document.description = description ?? document.description;
//         document.comment = comment ?? document.comment;
//         document.link = link ?? document.link;
//         document.tags = parsedTags;
//         document.metadata = parsedMetadata;

//         // Update document date
//         if (documentDate) {
//             const [day, month, year] = documentDate.split("-");
//             document.documentDate = new Date(`${year}-${month}-${day}`);
//         }

//         // Compliance
//         if (compliance) {
//             document.compliance.isCompliance = compliance === "yes";
//             if (expiryDate) {
//                 const [day, month, year] = expiryDate.split("-");
//                 document.compliance.expiryDate = new Date(`${year}-${month}-${day}`);
//             }
//         }

//         // ---------------- Add new files as versions ----------------
//         if (fileIds && fileIds.length > 0) {
//             let parsedFileIds = typeof fileIds === "string" ? JSON.parse(fileIds) : fileIds;

//             for (const fileId of parsedFileIds) {
//                 if (!mongoose.Types.ObjectId.isValid(fileId)) continue;

//                 const tempFile = await TempFile.findById(fileId);
//                 if (!tempFile || tempFile.status !== "temp") continue;

//                 tempFile.status = "permanent";
//                 await tempFile.save();

//                 // Add as a new version
//                 await document.addNewVersion({
//                     file: tempFile.s3Filename,
//                     s3Url: tempFile.s3Url,
//                     originalName: tempFile.originalName,
//                     hash: tempFile.hash || null
//                 }, req.user._id);
//             }
//         }

//         // Signature handling
//         if (req.files?.signature?.[0]) {
//             const file = req.files.signature[0];
//             if (!file.mimetype.startsWith("image/")) {
//                 return failResponse(res, "Signature must be an image", 400);
//             }
//             document.signature = {
//                 fileName: file.originalname,
//                 fileUrl: file.path || file.filename,
//             };
//         } else if (req.body.signature) {
//             const base64Data = req.body.signature;
//             if (!base64Data.startsWith("data:image/")) {
//                 return failResponse(res, "Invalid signature format", 400);
//             }

//             // Upload base64 to Cloudinary
//             const uploaded = await cloudinary.uploader.upload(base64Data, {
//                 folder: "signatures",
//                 public_id: `signature-${Date.now()}`,
//                 overwrite: true,
//             });

//             document.signature = {
//                 fileName: uploaded.original_filename,
//                 fileUrl: uploaded.secure_url,
//             };
//         }

//         await document.save();
//         return successResponse(res, { document }, "Document updated successfully");

//     } catch (error) {
//         logger.error("Update error:", error);
//         return errorResponse(res, error, "Failed to update document");
//     }
// };

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

        // Iterate over req.body keys and update dynamically
        for (const [key, value] of Object.entries(req.body)) {
            if (value === undefined) continue; // skip undefined

            switch (key) {
                case "metadata":
                    try {
                        document.metadata = typeof value === "string" ? JSON.parse(value) : value;
                    } catch (err) {
                        logger.warn("Invalid metadata, ignoring", err);
                    }
                    break;

                case "tags":
                    if (Array.isArray(value)) {
                        document.tags = value.map(tag => tag.trim());
                    } else if (typeof value === "string") {
                        document.tags = value.split(",").map(tag => tag.trim());
                    }
                    break;

                case "documentDate":
                    const [day, month, year] = value.split("-");
                    document.documentDate = new Date(`${year}-${month}-${day}`);
                    break;

                case "compliance":
                    document.compliance.isCompliance = value === "yes";
                    if (req.body.expiryDate) {
                        const [d, m, y] = req.body.expiryDate.split("-");
                        document.compliance.expiryDate = new Date(`${y}-${m}-${d}`);
                    }
                    break;

                case "fileIds":
                    if (value && value.length > 0) {
                        let parsedFileIds = Array.isArray(value) ? value : JSON.parse(value);
                        for (const fileId of parsedFileIds) {
                            if (!mongoose.Types.ObjectId.isValid(fileId)) continue;

                            const tempFile = await TempFile.findById(fileId);
                            if (!tempFile || tempFile.status !== "temp") continue;

                            tempFile.status = "permanent";
                            await tempFile.save();

                            await document.addNewVersion({
                                file: tempFile.s3Filename,
                                s3Url: tempFile.s3Url,
                                originalName: tempFile.originalName,
                                hash: tempFile.hash || null
                            }, req.user._id);
                        }
                    }
                    break;

                case "signature":
                    // signature handled separately below
                    break;

                default:
                    document[key] = value; // direct assignment for simple fields
            }
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
        const userId = req.user._id; // fixed destructuring
        const { accessLevel, duration, customStart, customEnd } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        let expiresAt = null;
        const now = new Date();

        // Set expiry based on duration
        switch (duration) {
            case "oneday":
                expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case "oneweek":
                expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case "onemonth":
                expiresAt = new Date(now.getTime());
                expiresAt.setMonth(expiresAt.getMonth() + 1);
                break;
            case "custom":
                if (customStart && customEnd) {
                    const start = new Date(customStart);
                    const end = new Date(customEnd);
                    if (isNaN(start) || isNaN(end)) {
                        return res.status(400).json({ success: false, message: "Invalid custom dates" });
                    }
                    expiresAt = end;
                }
                break;
            case "lifetime":
            case "onetime":
            default:
                expiresAt = null;
        }

        // Update sharedWith
        const existingIndex = doc.sharedWith.findIndex(sw => sw.user.toString() === userId.toString());
        if (existingIndex >= 0) {
            doc.sharedWith[existingIndex].accessLevel = accessLevel;
            doc.sharedWith[existingIndex].expiresAt = expiresAt;
        } else {
            doc.sharedWith.push({ user: userId, accessLevel, expiresAt });
        }

        // Update flattened array
        doc.sharedWithUsers = doc.sharedWith.map(sw => sw.user);

        await doc.save();

        return res.json({ success: true, message: "Document shared successfully", document: doc });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
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

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        const sharedUser = doc.sharedWith.find(u => u.user.toString() === userId);
        if (!sharedUser) return res.status(404).json({ success: false, message: "User not found in shared list" });

        if (accessLevel) sharedUser.accessLevel = accessLevel;
        if (canDownload !== undefined) sharedUser.canDownload = canDownload;

        await doc.save();
        res.json({ success: true, message: "User access updated successfully", data: sharedUser });
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

        const initialLength = doc.sharedWith.length;
        doc.sharedWith = doc.sharedWith.filter(u => u.user.toString() !== userId);
        doc.sharedWithUsers = doc.sharedWithUsers.filter(u => u.toString() !== userId);

        if (doc.sharedWith.length === initialLength) {
            return res.status(404).json({ success: false, message: "User not found in shared list" });
        }

        await doc.save();
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

        const doc = await Document.findById(documentId)
            .populate("sharedWith.user", "name email role") // adjust fields as needed
            .lean();

        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        const data = doc.sharedWith.map(sw => ({
            userId: sw.user._id,
            name: sw.user.name,
            email: sw.user.email,
            role: sw.user.role || null,
            accessLevel: sw.accessLevel,
            expiresAt: sw.expiresAt,
            inviteStatus: sw.inviteStatus,
            sharedAt: sw.sharedAt
        }));

        return res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const inviteUser = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userEmail, accessLevel, duration, customEnd } = req.body;
        const inviterId = req.user._id;

        // Validation
        if (!userEmail) {
            return res.status(400).json({ success: false, message: "User email is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: "Invalid document ID" });
        }

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        // Check if user is owner or has edit access
        const isOwner = doc.owner.toString() === inviterId.toString();
        const hasEditAccess = doc.sharedWith.some(sw =>
            sw.user.toString() === inviterId.toString() &&
            sw.accessLevel === 'edit' &&
            sw.inviteStatus === 'accepted'
        );

        if (!isOwner && !hasEditAccess) {
            return res.status(403).json({ success: false, message: "You don't have permission to share this document" });
        }

        // Find or create user by email
        let user = await User.findOne({ email: userEmail });
        if (!user) {
            // Generate a more secure temporary password
            const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            user = new User({
                email: userEmail,
                name: userEmail.split('@')[0], // Use email prefix as name
                password: tempPassword,
                isTemporary: true // Flag for temporary users
            });
            await user.save();
        }

        const userId = user._id;

        // Calculate expiry
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
                if (customEnd) {
                    expiresAt = new Date(customEnd);
                    if (expiresAt <= now) {
                        return res.status(400).json({ success: false, message: "Custom end date must be in the future" });
                    }
                }
                break;
            case "lifetime":
            case "onetime":
                // No expiry for lifetime, onetime might need special handling
                expiresAt = null;
                break;
            default:
                expiresAt = null;
        }

        // Update or add to sharedWith
        const existingIndex = doc.sharedWith.findIndex(sw => sw.user.toString() === userId.toString());

        if (existingIndex >= 0) {
            doc.sharedWith[existingIndex].accessLevel = accessLevel;
            doc.sharedWith[existingIndex].expiresAt = expiresAt;
            doc.sharedWith[existingIndex].inviteStatus = "pending";
            doc.sharedWith[existingIndex].sharedAt = new Date();
        } else {
            doc.sharedWith.push({
                user: userId,
                accessLevel,
                expiresAt,
                inviteStatus: "pending",
                sharedAt: new Date()
            });
        }

        // Update sharedWithUsers array
        doc.sharedWithUsers = doc.sharedWith.map(sw => sw.user);
        await doc.save();

        // Send invite email
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/documents/${documentId}/invite/${userId}/accept`;

        await sendEmail({
            to: userEmail,
            subject: "Document Invitation - E-Sangrah",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Document Sharing Invitation</h2>
            <p>You have been invited to access a document on E-Sangrah.</p>
            <p><strong>Document:</strong> ${doc.metadata?.fileName || 'Unnamed Document'}</p>
            <p><strong>Access Level:</strong> ${accessLevel}</p>
            ${expiresAt ? `<p><strong>Expires:</strong> ${expiresAt.toLocaleDateString()}</p>` : ''}
            <div style="margin: 20px 0;">
                <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Accept Invitation & View Document
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">
                Clicking this link will automatically accept the invitation and redirect you to your documents list.
            </p>
            <hr>
            <p style="color: #999; font-size: 12px;">
                If the button doesn't work, copy and paste this link in your browser:<br>
                ${inviteLink}
            </p>
        </div>
    `,
            fromName: "E-Sangrah Support"
        });

        return res.json({ success: true, message: "Invite sent successfully" });
    } catch (err) {
        console.error("Invite user error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Auto-accept invite when email link is clicked
export const autoAcceptInvite = async (req, res) => {
    try {
        const { documentId, userId } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(documentId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid document or user ID" });
        }

        // Find the document
        const doc = await Document.findById(documentId);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        // Find the shared entry
        const sharedIndex = doc.sharedWith.findIndex(sw => sw.user.toString() === userId);
        if (sharedIndex === -1) {
            return res.status(404).json({ success: false, message: "Invite not found" });
        }

        const sharedEntry = doc.sharedWith[sharedIndex];

        // Check if invite is already accepted
        if (sharedEntry.inviteStatus === 'accepted') {
            return res.redirect('/documents/list');
        }

        // Check if invite is expired
        if (sharedEntry.expiresAt && new Date() > sharedEntry.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "This invitation has expired"
            });
        }

        // Check if invite was rejected
        if (sharedEntry.inviteStatus === 'rejected') {
            return res.status(400).json({
                success: false,
                message: "This invitation was already rejected"
            });
        }

        // Update invite status to accepted
        sharedEntry.inviteStatus = 'accepted';
        sharedEntry.acceptedAt = new Date();

        // Ensure user is in sharedWithUsers array
        if (!doc.sharedWithUsers.includes(userId)) {
            doc.sharedWithUsers.push(userId);
        }

        await doc.save();

        // Redirect to documents list page
        res.redirect('/documents/list');

    } catch (err) {
        console.error("Auto accept invite error:", err);
        res.status(500).json({ success: false, message: "Server error" });
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