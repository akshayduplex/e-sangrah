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
            comment: comment || null
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
                        const newFileIds = [];

                        for (const tempId of parsedFileIds) {
                            if (!mongoose.Types.ObjectId.isValid(tempId)) continue;

                            const tempFile = await TempFile.findById(tempId);
                            if (!tempFile || tempFile.status !== "temp") continue;

                            tempFile.status = "permanent";
                            await tempFile.save();

                            const newFile = await File.create({
                                document: document._id,
                                file: tempFile.s3Filename,
                                s3Url: tempFile.s3Url,
                                originalName: tempFile.originalName,
                                hash: tempFile.hash || null,
                                version: document.currentVersion + 1,
                                uploadedBy: req.user._id,
                                uploadedAt: new Date(),
                                isPrimary: true,
                                status: "active"
                            });

                            // mark previous primary files inactive
                            await File.updateMany(
                                { document: document._id, isPrimary: true, status: "active" },
                                { $set: { isPrimary: false } }
                            );

                            newFileIds.push(newFile._id);
                            document.currentVersion += 1;
                        }

                        document.files.push(...newFileIds);
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
 * Update document with complete change tracking
 */
// export const updateDocument = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { id } = req.params;
//         const { changeDescription, changeType = 'minor' } = req.body;

//         // Get current document state BEFORE updates
//         const oldDocument = await Document.findById(id).session(session);
//         if (!oldDocument) {
//             await session.abortTransaction();
//             return failResponse(res, "Document not found", 404);
//         }

//         // Clone old document for comparison
//         const oldState = oldDocument.toObject();

//         // Create version snapshot BEFORE any changes
//         const versionSnapshot = await VersionManager.createVersionSnapshot(oldDocument);
//         const previousVersion = oldDocument.versioning.currentVersion;

//         // Calculate next version
//         const nextVersion = VersionManager.getNextVersion(previousVersion, changeType);

//         // Apply updates to the document
//         const document = await Document.findById(id).session(session);

//         // Track which fields are being updated
//         const updatedFields = {};

//         // Handle folder update
//         if (req.body.folderId && mongoose.Types.ObjectId.isValid(req.body.folderId)) {
//             updatedFields.folderId = req.body.folderId;
//             document.folderId = req.body.folderId;
//         }

//         // Iterate over other fields
//         for (const [key, value] of Object.entries(req.body)) {
//             if (['fileIds', 'changeDescription', 'changeType', 'folderId'].includes(key)) continue;

//             if (value !== undefined) {
//                 switch (key) {
//                     case "metadata":
//                         try {
//                             updatedFields.metadata = typeof value === "string" ? JSON.parse(value) : value;
//                             document.metadata = updatedFields.metadata;
//                         } catch (err) {
//                             logger.warn("Invalid metadata, ignoring", err);
//                         }
//                         break;

//                     case "tags":
//                         if (Array.isArray(value)) {
//                             updatedFields.tags = value.map(tag => tag.trim());
//                             document.tags = updatedFields.tags;
//                         } else if (typeof value === "string") {
//                             updatedFields.tags = value.split(",").map(tag => tag.trim());
//                             document.tags = updatedFields.tags;
//                         }
//                         break;

//                     case "documentDate":
//                         const [day, month, year] = value.split("-");
//                         updatedFields.documentDate = new Date(`${year}-${month}-${day}`);
//                         document.documentDate = updatedFields.documentDate;
//                         break;

//                     case "compliance":
//                         document.compliance.isCompliance = value === "yes";
//                         updatedFields.compliance = document.compliance;
//                         if (req.body.expiryDate) {
//                             const [d, m, y] = req.body.expiryDate.split("-");
//                             document.compliance.expiryDate = new Date(`${y}-${m}-${d}`);
//                         }
//                         break;

//                     default:
//                         updatedFields[key] = value;
//                         document[key] = value;
//                 }
//             }
//         }

//         // Handle file updates
//         let fileChanges = false;
//         if (req.body.fileIds && req.body.fileIds.length > 0) {
//             fileChanges = true;
//             let parsedFileIds = Array.isArray(req.body.fileIds) ? 
//                 req.body.fileIds : JSON.parse(req.body.fileIds);

//             const newFileIds = [];
//             for (const tempId of parsedFileIds) {
//                 if (!mongoose.Types.ObjectId.isValid(tempId)) continue;

//                 const tempFile = await TempFile.findById(tempId).session(session);
//                 if (!tempFile || tempFile.status !== "temp") continue;

//                 tempFile.status = "permanent";
//                 await tempFile.save({ session });

//                 const newFile = await File.create([{
//                     document: document._id,
//                     file: tempFile.s3Filename,
//                     s3Url: tempFile.s3Url,
//                     originalName: tempFile.originalName,
//                     version: parseFloat(nextVersion),
//                     uploadedBy: req.user._id,
//                     uploadedAt: new Date(),
//                     isPrimary: true,
//                     status: "active"
//                 }], { session });

//                 newFileIds.push(newFile[0]._id);
//             }

//             // Mark previous primary files as inactive
//             await File.updateMany(
//                 { document: document._id, isPrimary: true },
//                 { $set: { isPrimary: false } },
//                 { session }
//             );

//             document.files.push(...newFileIds);
//             updatedFields.files = document.files;
//         }

//         // Handle signature updates
//         if (req.files?.signature?.[0] || req.body.signature) {
//             // Your existing signature handling code...
//             updatedFields.signature = document.signature;
//         }

//         // Detect changes and generate description
//         const changes = VersionManager.detectChanges(oldState, document.toObject());
//         const autoChangeDescription = VersionManager.generateChangeDescription(changes);

//         // Use provided description or auto-generated one
//         const finalChangeDescription = changeDescription || 
//                                     (fileChanges ? 'File updated' : autoChangeDescription) || 
//                                     'Document updated';

//         // Update versioning information
//         document.versioning.previousVersion = previousVersion;
//         document.versioning.currentVersion = parseFloat(nextVersion);

//         // Add to version history
//         document.versioning.versionHistory.unshift({
//             version: parseFloat(nextVersion),
//             timestamp: new Date(),
//             changedBy: req.user._id,
//             changes: finalChangeDescription,
//             changesDetail: changes, // Store detailed changes
//             snapshot: versionSnapshot,
//             files: document.files // Reference to files at this version
//         });

//         // Limit history size
//         if (document.versioning.versionHistory.length > 50) {
//             document.versioning.versionHistory = document.versioning.versionHistory.slice(0, 50);
//         }

//         await document.save({ session });
//         await session.commitTransaction();

//         // Populate for response
//         await document.populate([
//             { path: "versioning.versionHistory.changedBy", select: "name email" },
//             { path: "department", select: "name" },
//             { path: "project", select: "projectName" },
//             { path: "files", select: "originalName version uploadedAt" }
//         ]);

//         return successResponse(res, { 
//             document,
//             versionInfo: {
//                 previous: previousVersion,
//                 current: document.versioning.currentVersion,
//                 changes: finalChangeDescription,
//                 detailedChanges: changes
//             }
//         }, "Document updated successfully");

//     } catch (error) {
//         await session.abortTransaction();
//         logger.error("Update error:", error);
//         return errorResponse(res, error, "Failed to update document");
//     } finally {
//         session.endSession();
//     }
// };


/**
 * Restore to previous version
 */
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
            .populate('versioning.versionHistory.changedBy', 'name email avatar')
            .select('versioning metadata.mainHeading description currentVersion');

        if (!document) {
            return failResponse(res, "Document not found", 404);
        }

        // Enhance version history with additional data
        const enhancedHistory = await Promise.all(
            document.versioning.versionHistory.map(async (version) => {
                // Get files for this version
                const versionFiles = await File.find({
                    _id: { $in: version.snapshot.files || [] }
                }).select('originalName fileSize uploadedAt version');

                return {
                    version: version.version,
                    timestamp: version.timestamp,
                    changedBy: version.changedBy,
                    changes: version.changes,
                    changesDetail: version.changesDetail,
                    files: versionFiles,
                    isCurrent: version.version === document.versioning.currentVersion,
                    snapshotPreview: {
                        description: version.snapshot.description,
                        mainHeading: version.snapshot.metadata?.mainHeading,
                        tags: version.snapshot.tags
                    }
                };
            })
        );

        return successResponse(res, {
            documentId: document._id,
            documentName: document.metadata?.mainHeading || document.description || 'Untitled',
            currentVersion: document.versioning.currentVersion,
            versionHistory: enhancedHistory,
            totalVersions: enhancedHistory.length
        }, "Version history retrieved successfully");

    } catch (error) {
        logger.error("Get version history error:", error);
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
export const shareDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
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

        const share = await SharedWith.findOneAndUpdate(
            { document: id, user: userId },
            { accessLevel, expiresAt, sharedAt: new Date(), inviteStatus: "pending" },
            { upsert: true, new: true }
        );

        // update quick lookup array in Document
        await Document.findByIdAndUpdate(id, { $addToSet: { sharedWithUsers: userId } });

        return res.json({ success: true, message: "Document shared successfully", data: share });

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

        const shares = await SharedWith.find({ document: documentId })
            .populate("user", "name email role");
        if (!shares) return res.status(404).json({ success: false, message: "Shares not found" });

        const data = shares.map(sw => ({
            userId: sw.user._id,
            name: sw.user.name,
            email: sw.user.email,
            role: sw.user.role,
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

        // Check if inviter is allowed
        const isOwner = doc.owner.toString() === inviterId.toString();
        const existingShare = await SharedWith.findOne({ document: documentId, user: inviterId, accessLevel: "edit", inviteStatus: "accepted" });
        const hasEditAccess = !!existingShare;

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

        // Upsert into SharedWith
        await SharedWith.findOneAndUpdate(
            { document: documentId, user: userId },
            {
                accessLevel,
                expiresAt,
                inviteStatus: "pending",
                sharedAt: new Date()
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