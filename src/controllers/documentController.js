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
import SharedWith from "../models/SharedWith.js";
import File from "../models/File.js";
import { bumpVersion } from "../utils/bumpVersion.js";

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
            .populate("owner", "name email")
            .populate("documentDonor", "name")
            .populate("documentVendor", "name")
            .populate("projectManager", "name")
            .populate("folderId", "name")
            .populate("sharedWithUsers", "name")
            .populate("files")
            .sort(sort)
            .select("metadata signature description sharedWithUsers documentVendor documentDonor project department owner status tags files link createdAt updatedAt remark compliance")
            .skip(skip)
            .limit(limitNum).
            lean();

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
        const parsedTags = tags ? tags.split(",").map(t => t.trim()) : [];

        // ------------------- Compliance -------------------
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

        // ------------------- Document date -------------------
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

        // ------------------- Create Document first -------------------
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
            compliance: { isCompliance, expiryDate: parsedExpiryDate },
            files: [], // empty for now
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

        // ------------------- Process files -------------------
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

        parsedFileIds = parsedFileIds
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        const fileDocs = [];
        for (const fileId of parsedFileIds) {
            try {
                const tempFile = await TempFile.findById(fileId);
                console.log("TempFile", tempFile);
                if (!tempFile || tempFile.status !== "temp") continue;

                tempFile.status = "permanent";
                await tempFile.save();

                const newFile = await File.create({
                    document: document._id, // now valid
                    file: tempFile.s3Filename,
                    s3Url: tempFile.s3Url,
                    originalName: tempFile.originalName,
                    version: 1,
                    uploadedBy: req.user._id,
                    uploadedAt: new Date(),
                    isPrimary: fileDocs.length === 0,
                    status: "active"
                });
                fileDocs.push(newFile._id);
            } catch (err) {
                console.error(`Failed to create file for ${fileId}`, err);
                logger.warn(`Skipping invalid file ID: ${fileId}`, err);
            }
        }

        // Update Document with file references
        if (fileDocs.length > 0) {
            document.files = fileDocs;
            await document.save();
        }

        // ------------------- Signature -------------------
        if (req.files?.signatureFile?.[0]) {
            const file = req.files.signatureFile[0];
            if (!file.mimetype.startsWith("image/")) {
                return failResponse(res, "Signature must be an image", 400);
            }
            document.signature = {
                fileName: file.originalname,
                fileUrl: file.path || file.filename
            };
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
        }

        await document.save();

        // ------------------- Notification -------------------
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

        await document.populate([
            { path: "department", select: "name" },
            { path: "project", select: "projectName" },
            { path: "owner", select: "name email" }
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

//         // Iterate over req.body keys and update dynamically
//         for (const [key, value] of Object.entries(req.body)) {
//             if (value === undefined) continue; // skip undefined

//             switch (key) {
//                 case "metadata":
//                     try {
//                         document.metadata = typeof value === "string" ? JSON.parse(value) : value;
//                     } catch (err) {
//                         logger.warn("Invalid metadata, ignoring", err);
//                     }
//                     break;

//                 case "tags":
//                     if (Array.isArray(value)) {
//                         document.tags = value.map(tag => tag.trim());
//                     } else if (typeof value === "string") {
//                         document.tags = value.split(",").map(tag => tag.trim());
//                     }
//                     break;

//                 case "documentDate":
//                     const [day, month, year] = value.split("-");
//                     document.documentDate = new Date(`${year}-${month}-${day}`);
//                     break;

//                 case "compliance":
//                     document.compliance.isCompliance = value === "yes";
//                     if (req.body.expiryDate) {
//                         const [d, m, y] = req.body.expiryDate.split("-");
//                         document.compliance.expiryDate = new Date(`${y}-${m}-${d}`);
//                     }
//                     break;

//                 case "fileIds":
//                     if (value && value.length > 0) {
//                         let parsedFileIds = Array.isArray(value) ? value : JSON.parse(value);
//                         const newFileIds = [];

//                         for (const tempId of parsedFileIds) {
//                             if (!mongoose.Types.ObjectId.isValid(tempId)) continue;
//                             const tempFile = await TempFile.findById(tempId);
//                             if (!tempFile || tempFile.status !== "temp") continue;

//                             tempFile.status = "permanent";
//                             await tempFile.save();

//                             // Increment version
//                             const currentVersion = parseFloat(document.versioning.currentVersion.toString());
//                             const newVersion = (currentVersion + 0.1).toFixed(1);

//                             // Mark old primary inactive
//                             await File.updateMany(
//                                 { document: document._id, isPrimary: true, status: "active" },
//                                 { $set: { isPrimary: false } }
//                             );

//                             const newFile = await File.create({
//                                 document: document._id,
//                                 file: tempFile.s3Filename,
//                                 s3Url: tempFile.s3Url,
//                                 originalName: tempFile.originalName,
//                                 version: parseFloat(newVersion),
//                                 uploadedBy: req.user._id,
//                                 uploadedAt: new Date(),
//                                 isPrimary: true,
//                                 status: "active"
//                             });

//                             document.versioning.previousVersion = document.versioning.currentVersion;
//                             document.versioning.currentVersion = mongoose.Types.Decimal128.fromString(newVersion);
//                             document.versionHistory.push({
//                                 version: mongoose.Types.Decimal128.fromString(newVersion),
//                                 timestamp: new Date(),
//                                 changedBy: req.user._id,
//                                 changes: "File added",
//                                 file: newFile._id,
//                                 snapshot: {},
//                             });

//                             newFileIds.push(newFile._id);
//                         }

//                         document.files.push(...newFileIds);
//                     }
//                     break;

//                 case "signature":
//                     // signature handled separately below
//                     break;

//                 default:
//                     document[key] = value; // direct assignment for simple fields
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
 * PATCH /api/documents/:id - Update document with versioning
 * Fully working implementation
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

        // Process all fields from request
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

                case "documentDate":
                    try {
                        const [day, month, year] = value.split("-");
                        const newDate = new Date(`${year}-${month}-${day}`);
                        if (!document.documentDate || document.documentDate.getTime() !== newDate.getTime()) {
                            document.documentDate = newDate;
                            hasChanges = true;
                            changeReason = "Document date updated";
                            changedFields.push("documentDate");
                        }
                    } catch (error) {
                        console.warn("Invalid document date format:", error.message);
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
                    if (value) {
                        try {
                            const [d, m, y] = value.split("-");
                            const newExpiry = new Date(`${y}-${m}-${d}`);
                            if (!document.compliance.expiryDate || document.compliance.expiryDate.getTime() !== newExpiry.getTime()) {
                                document.compliance.expiryDate = newExpiry;
                                hasChanges = true;
                                changeReason = "Expiry date updated";
                                changedFields.push("compliance");
                            }
                        } catch (error) {
                            console.warn("Invalid expiry date format:", error.message);
                        }
                    }
                    break;

                case "fileIds":
                    if (value && value.length > 0) {
                        try {
                            const parsedIds = Array.isArray(value) ? value : JSON.parse(value);
                            const validIds = parsedIds.filter(id => mongoose.Types.ObjectId.isValid(id));
                            if (validIds.length > 0) {
                                await processFileUpdates(document, validIds, req.user);
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
                case "status":
                    if (document[key] !== value) {
                        document[key] = value;
                        hasChanges = true;
                        changeReason = `${key.charAt(0).toUpperCase() + key.slice(1)} updated`;
                        changedFields.push(key);
                    }
                    break;

                case "signature":
                    // handled separately
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

        // Save and create version history
        if (hasChanges) {
            if (fileUpdates) changeReason = "Files and content updated";
            bumpVersion(document);
            await createVersionHistory(document, req.user, changeReason, changedFields);
            await document.save();

            const populatedDoc = await Document.findById(document._id)
                .populate('files')
                .populate('owner', 'name email')
                .populate('folderId', 'name')
                .populate('versionHistory.changedBy', 'name email');

            return successResponse(res, {
                document: populatedDoc,
                changes: changeReason,
                version: document.versioning.currentVersion.toString()
            }, "Document updated successfully");
        } else {
            const populatedDoc = await Document.findById(document._id)
                .populate('files')
                .populate('owner', 'name email');

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
            version: document.versioning.currentVersion, // version will be bumped outside
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

            // If using Cloudinary
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
                // Local storage fallback
                document.signature = {
                    fileName: `signature-${Date.now()}.png`,
                    fileUrl: base64Data, // store as base64 or process accordingly
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
        if (field === "metadata") snapshot[field] = { ...document.metadata };
        else if (field === "tags") snapshot[field] = [...document.tags];
        else if (field === "files") snapshot[field] = document.files.map(f => f.toString());
        else if (field === "compliance") snapshot[field] = { ...document.compliance };
        else if (field === "signature") snapshot[field] = document.signature ? { ...document.signature } : null;
        else snapshot[field] = document[field];
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id, version } = req.params;
        const { restoreNotes = '' } = req.body;

        const document = await Document.findById(id).session(session);
        if (!document) {
            await session.abortTransaction();
            return failResponse(res, "Document not found", 404);
        }

        // Find the target version
        const targetVersion = document.versioning.versionHistory.find(
            v => v.version === parseFloat(version)
        );

        if (!targetVersion) {
            await session.abortTransaction();
            return failResponse(res, `Version ${version} not found`, 404);
        }

        // Create snapshot of CURRENT state before restore
        const currentSnapshot = await VersionManager.createVersionSnapshot(document);
        const previousVersion = document.versioning.currentVersion;

        // Calculate new version number for the restore action
        const newVersion = VersionManager.getNextVersion(previousVersion, 'minor');

        // Restore document fields from the target version snapshot
        const snapshot = targetVersion.snapshot;

        document.description = snapshot.description;
        document.metadata = snapshot.metadata;
        document.tags = snapshot.tags;
        document.compliance = snapshot.compliance;
        document.project = snapshot.project;
        document.department = snapshot.department;
        document.projectManager = snapshot.projectManager;
        document.documentDonor = snapshot.documentDonor;
        document.documentVendor = snapshot.documentVendor;
        document.status = snapshot.status;
        document.link = snapshot.link;
        document.comment = snapshot.comment;
        document.documentDate = snapshot.documentDate;

        // Handle file restoration
        if (snapshot.files && snapshot.files.length > 0) {
            // Get files from the target version
            const versionFiles = await File.find({
                _id: { $in: snapshot.files }
            }).session(session);

            // Create new file entries for the restored version (to maintain file history)
            const restoredFileIds = [];
            for (const oldFile of versionFiles) {
                const newFile = await File.create([{
                    document: document._id,
                    file: oldFile.file,
                    s3Url: oldFile.s3Url,
                    originalName: oldFile.originalName,
                    version: parseFloat(newVersion),
                    uploadedBy: req.user._id,
                    uploadedAt: new Date(),
                    isPrimary: oldFile.isPrimary,
                    status: "active",
                    restoredFrom: oldFile._id, // Track original file
                    restoredAt: new Date()
                }], { session });

                restoredFileIds.push(newFile[0]._id);
            }

            // Mark all current files as inactive
            await File.updateMany(
                { document: document._id, status: "active" },
                { $set: { isPrimary: false, status: "inactive" } },
                { session }
            );

            // Mark restored files as active and set primary
            if (restoredFileIds.length > 0) {
                await File.updateMany(
                    { _id: { $in: restoredFileIds } },
                    { $set: { status: "active", isPrimary: true } },
                    { session }
                );
            }

            document.files = restoredFileIds;
        }

        // Update versioning information
        document.versioning.previousVersion = previousVersion;
        document.versioning.currentVersion = parseFloat(newVersion);

        // Add restore action to version history
        document.versioning.versionHistory.unshift({
            version: parseFloat(newVersion),
            timestamp: new Date(),
            changedBy: req.user._id,
            changes: `Restored to version ${version}${restoreNotes ? ` - ${restoreNotes}` : ''}`,
            changesDetail: [
                {
                    field: 'restore_action',
                    oldValue: `Version ${previousVersion}`,
                    newValue: `Version ${version}`
                }
            ],
            snapshot: currentSnapshot, // Store current state before restore
            restoredFrom: parseFloat(version),
            isRestorePoint: true
        });

        await document.save({ session });
        await session.commitTransaction();

        // Populate for response
        await document.populate([
            { path: "versioning.versionHistory.changedBy", select: "name email" },
            { path: "department", select: "name" },
            { path: "project", select: "projectName" },
            { path: "files", select: "originalName version uploadedAt" }
        ]);

        return successResponse(res, {
            document,
            restoreInfo: {
                fromVersion: version,
                toVersion: newVersion,
                previousVersion: previousVersion,
                restoredAt: new Date()
            }
        }, `Document successfully restored to version ${version}`);

    } catch (error) {
        await session.abortTransaction();
        logger.error("Restore version error:", error);
        return errorResponse(res, error, "Failed to restore version");
    } finally {
        session.endSession();
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

        // Find the specific version in history
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

        // Reconstruct the document as it was at that version
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

        // Populate referenced fields
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

        // Enhance version history with additional data
        const enhancedHistory = await Promise.all(
            document.versionHistory.map(async (version) => {
                // Get files for this version
                const versionFiles = await File.find({
                    _id: { $in: version.snapshot?.files || [] }
                }).select('originalName size uploadedAt version');

                return {
                    previousVersion: version.previousVersion?.toString(),
                    version: version.version?.toString(),
                    nextVersion: version.nextVersion?.toString(),
                    timestamp: version.timestamp,
                    changedBy: version.changedBy,
                    changes: version.changes,
                    files: versionFiles,
                    isCurrent: version.version?.toString() === document.versioning.currentVersion?.toString(),
                    snapshotPreview: {
                        description: version.snapshot?.description,
                        mainHeading: version.snapshot?.metadata?.mainHeading,
                        tags: version.snapshot?.tags
                    }
                };
            })
        );

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
// export const shareDocument = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const userId = req.user._id;
//         const { accessLevel, duration, customStart, customEnd } = req.body;
//         console.log("Frontend payload:", req.body);

//         if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
//             return res.status(400).json({ success: false, message: "Invalid ID" });
//         }

//         const doc = await Document.findById(id);
//         if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

//         let expiresAt = null;
//         const now = new Date();

//         switch (duration) {
//             case "oneday":
//                 expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
//                 break;

//             case "oneweek":
//                 expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
//                 break;

//             case "onemonth":
//                 expiresAt = new Date(now);
//                 expiresAt.setMonth(expiresAt.getMonth() + 1);
//                 break;

//             case "custom":
//                 if (!customStart || !customEnd) {
//                     console.log("Custom dates missing:", { customStart, customEnd });
//                     return res.status(400).json({ success: false, message: "Custom start and end dates are required" });
//                 }

//                 // Parse dates in local timezone
//                 const start = new Date(customStart);
//                 const end = new Date(customEnd);

//                 if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//                     console.log("Invalid custom dates:", { start, end });
//                     return res.status(400).json({ success: false, message: "Invalid custom dates" });
//                 }

//                 // Optional: set expiry to the end of the end day (23:59:59)
//                 end.setHours(23, 59, 59, 999);
//                 expiresAt = end;
//                 console.log("Computed expiresAt:", expiresAt);
//                 break;

//             case "lifetime":
//             case "onetime":
//             default:
//                 expiresAt = null;
//                 break;
//         }

//         console.log("Computed expiresAt:", expiresAt);

//         const share = await SharedWith.findOneAndUpdate(
//             { document: id, user: userId },
//             { accessLevel, expiresAt, sharedAt: new Date(), inviteStatus: "pending" },
//             { upsert: true, new: true }
//         );

//         // update quick lookup array in Document
//         await Document.findByIdAndUpdate(id, { $addToSet: { sharedWithUsers: userId } });

//         return res.json({ success: true, message: "Document shared successfully", data: share });

//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ success: false, message: "Server error" });
//     }
// };
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
            generalRole = "viewer",
            targetUserId
        } = req.body;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const doc = await Document.findById(id);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        // Check permission
        const isOwner = doc.owner.toString() === userId.toString();
        const existingEditAccess = await SharedWith.findOne({
            document: id,
            user: userId,
        });
        if (!isOwner && !existingEditAccess) {
            return res.status(403).json({ success: false, message: "You don't have permission to share this document" });
        }

        // Determine expiration
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
                if (customEnd) {
                    expiresAt = new Date(customEnd);
                    if (expiresAt <= now)
                        return res.status(400).json({ success: false, message: "Custom end date must be in the future" });
                }
                break;
            case "onetime":
                used = false;
                break;
            case "lifetime":
            default:
                expiresAt = null;
        }

        // Determine which user to share with
        let shareUserId;
        if (!generalAccess) {
            if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
                return res.status(400).json({ success: false, message: "Invalid target user ID" });
            }
            shareUserId = targetUserId;
        }

        // Prepare update data
        const updateData = {
            accessLevel: generalAccess ? (generalRole === "editor" ? "edit" : "view") : accessLevel,
            expiresAt,
            duration,
            generalAccess
        };
        if (used !== undefined) updateData.used = used;

        // Update or create sharing record
        const updatedShare = await SharedWith.findOneAndUpdate(
            {
                document: id,
                ...(generalAccess ? { generalAccess: true } : { user: shareUserId })
            },
            updateData,
            { upsert: true, new: true } // Create if not exist
        );

        // Add to document's sharedWithUsers list if not general access
        if (!generalAccess) {
            await Document.findByIdAndUpdate(id, { $addToSet: { sharedWithUsers: shareUserId } });
        }

        return res.json({
            success: true,
            message: "Document share settings updated successfully",
            data: updatedShare
        });

    } catch (err) {
        console.error("Update document share error:", err);
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

        const shares = await SharedWith.find({ document: documentId, inviteStatus: 'accepted' })
            .populate("user", "name email");
        if (!shares) return res.status(404).json({ success: false, message: "Shares not found" });

        const data = shares.map(sw => ({
            userId: sw.user._id,
            name: sw.user.name,
            email: sw.user.email,
            accessLevel: sw.accessLevel,
            expiresAt: sw.expiresAt,
            canDownload: sw.canDownload,
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
        const { userEmail, accessLevel = "view", duration = "lifetime", customEnd } = req.body;
        const inviterId = req.user._id;

        // Validation
        if (!userEmail) return res.status(400).json({ success: false, message: "User email is required" });
        if (!mongoose.Types.ObjectId.isValid(documentId)) return res.status(400).json({ success: false, message: "Invalid document ID" });

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

        // Check permissions: owner or edit access
        const isOwner = doc.owner.toString() === inviterId.toString();
        const existingShare = await SharedWith.findOne({ document: documentId, user: inviterId, accessLevel: "edit" });
        if (!isOwner && !existingShare) return res.status(403).json({ success: false, message: "You don't have permission to share this document" });

        // Find or create user by email
        let user = await User.findOne({ email: userEmail });
        if (!user) {
            const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            user = new User({
                email: userEmail,
                name: userEmail.split('@')[0],
                password: tempPassword,
                isTemporary: true
            });
            await user.save();
        }

        const userId = user._id;

        // Compute expiresAt
        let expiresAt = null;
        const now = new Date();
        switch (duration) {
            case "oneday": expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
            case "oneweek": expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case "onemonth": expiresAt = new Date(now.setMonth(now.getMonth() + 1)); break;
            case "custom":
                if (customEnd) {
                    expiresAt = new Date(customEnd);
                    if (expiresAt <= now) return res.status(400).json({ success: false, message: "Custom end date must be in the future" });
                }
                break;
            case "lifetime":
            case "onetime":
            default:
                expiresAt = null;
        }

        // 1️⃣ Create or update SharedWith entry with minimal data
        await SharedWith.findOneAndUpdate(
            { document: documentId, user: userId },
            {
                document: documentId,
                user: userId,
                accessLevel,
                expiresAt,
                duration,
                inviteStatus: "pending", // added field for invite workflow
                used: false
            },
            { upsert: true, new: true }
        );

        // Keep document.sharedWithUsers synced
        await Document.findByIdAndUpdate(documentId, { $addToSet: { sharedWithUsers: userId } });

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
        const share = await SharedWith.findOne({ document: documentId, user: userId });
        if (!share) return res.status(404).json({ success: false, message: "Invite not found" });

        // Already accepted
        if (share.inviteStatus === "accepted") {
            return res.redirect("/documents/list");
        }

        // Expired
        if (share.expiresAt && new Date() > share.expiresAt) {
            return res.status(400).json({ success: false, message: "This invitation has expired" });
        }

        // Rejected
        if (share.inviteStatus === "rejected") {
            return res.status(400).json({ success: false, message: "This invitation was rejected" });
        }

        // Accept
        share.inviteStatus = "accepted";
        share.acceptedAt = new Date();
        await share.save();

        // Make sure user exists in quick lookup
        await Document.findByIdAndUpdate(documentId, { $addToSet: { sharedWithUsers: userId } });

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