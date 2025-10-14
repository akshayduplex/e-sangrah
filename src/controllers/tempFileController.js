import fs from "fs"
import { putObject, deleteObject, getObjectUrl } from "../utils/s3Helpers.js";
import TempFile from "../models/TempFile.js";
import crypto from "crypto";
import path from "path";
import Folder from "../models/Folder.js";
import File from "../models/File.js";
import { generateUniqueFileName } from "../helper/GenerateUniquename.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { ensureFolderHierarchy } from "../helper/FolderHierarchy.js";
// Unique filename generator

// Upload temporary file
export const uploadFile = async (req, res, folder) => {
    try {
        const ownerId = req.user._id;

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ success: false, message: "No files uploaded" });

        const uploadedFiles = [];
        let totalSize = 0;

        for (const file of req.files) {
            const { originalname, mimetype, size, key, location } = file;

            // ✅ Create file record
            const newFile = await File.create({
                file: key,
                s3Url: location,
                originalName: originalname,
                fileType: mimetype,
                uploadedBy: ownerId,
                folder: folder._id,
                projectId: folder.projectId,
                departmentId: folder.departmentId,
                fileSize: size,
            });

            // ✅ Push file reference to folder
            folder.files.push(newFile._id);
            totalSize += size;

            uploadedFiles.push({
                _id: newFile._id,
                originalName: originalname,
                s3Url: location,
                fileType: mimetype,
                size,
            });
        }

        // ✅ Update folder metadata
        folder.size += totalSize;
        await folder.save();

        return res.status(201).json({
            success: true,
            message: "Files uploaded successfully",
            folderId: folder._id,
            files: uploadedFiles,
        });
    } catch (err) {
        console.error("Upload to folder error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "File upload failed",
        });
    }
};

// Upload temporary file
export const tempUploadFile = async (req, res) => {
    try {
        const { folderId } = req.params;
        const ownerId = req.user._id;

        // Validate folderId
        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: "Invalid folder ID" });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }

        let totalSize = 0;
        const uploadedFiles = [];

        for (const file of req.files) {
            const { originalname, mimetype, size, key, location } = file;

            // Create TempFile document
            const tempFile = await TempFile.create({
                fileName: key,
                originalName: originalname,
                s3Filename: key,
                s3Url: location,
                fileType: mimetype,
                status: "temp",
                size: size || 0,
                folder: folder._id, // associate with folder
            });

            // Push only ObjectId to folder.files
            if (!folder.files) folder.files = [];
            folder.files.push(tempFile._id);

            totalSize += size || 0;

            uploadedFiles.push({
                fileId: tempFile._id,
                originalName: originalname,
                s3Filename: key,
                s3Url: location,
            });
        }

        // Update folder size
        folder.size += totalSize;
        await folder.save();

        // Populate files for response
        const populatedFolder = await Folder.findById(folder._id).populate("files");

        return res.status(201).json({
            success: true,
            message: "Files uploaded successfully",
            folderId: folder._id,
            files: uploadedFiles,
            folderFiles: populatedFolder.files, // optional: full file details
        });
    } catch (err) {
        console.error("Upload to folder error:", err);
        return res.status(500).json({ success: false, message: "File upload failed" });
    }
};
export const handleFolderUpload = async (req, res, parentFolder) => {
    try {
        const ownerId = req.user._id;
        const { projectId, departmentId } = parentFolder;
        const folderName = req.body.folderName;
        console.log("foldername", folderName);
        const uploadedFiles = [];
        let totalSize = 0;

        const folderMap = new Map();
        folderMap.set("", parentFolder._id); // root folder

        for (const file of req.files) {
            const { originalname, mimetype, size, key, location } = file;

            const folderPath = path.dirname(file.originalname); // nested path
            const fileName = path.basename(file.originalname);

            const folderId = await ensureFolderHierarchy(folderPath, parentFolder, folderMap, ownerId);

            // Save file
            const newFile = await file.create({
                file: key,
                s3Url: location,
                originalName: fileName,
                fileType: mimetype,
                uploadedBy: ownerId,
                folder: folderId,
                projectId,
                departmentId,
                fileSize: size,
            });

            // Update folder size & files
            await folder.findByIdAndUpdate(folderId, { $inc: { size }, $push: { files: newFile._id } });

            totalSize += size;

            uploadedFiles.push({
                fileId: newFile._id,
                folderId,
                path: folderPath,
                fileName,
                s3Url: location,
            });
        }

        // Update parent folder size
        await folder.findByIdAndUpdate(parentFolder._id, { $inc: { size: totalSize } });

        return res.status(201).json({
            success: true,
            message: "Folder (with subfolders) uploaded successfully",
            rootFolder: parentFolder._id,
            uploadedFiles,
        });

    } catch (err) {
        console.error("Whole folder upload error:", err);
        return res.status(500).json({ success: false, message: "Folder upload failed" });
    }
};

// Submit form and mark files permanent
export const submitForm = async (req, res) => {
    try {
        const { fileIds, formData } = req.body;

        if (!fileIds || !Array.isArray(fileIds)) {
            return res.status(400).json({ error: "File IDs are required" });
        }

        const results = [];

        for (const fileId of fileIds) {
            const file = await TempFile.findById(fileId);
            if (file && file.status === "temp") {
                file.status = "permanent";
                file.formDataId = formData?.id || null;
                await file.save();
                results.push({ fileId: file._id, status: "permanent", success: true });
            } else {
                results.push({ fileId, status: "not_found_or_invalid", success: false });
            }
        }

        res.json({
            success: true,
            message: "Form submitted successfully",
            files: results,
            formData,
        });
    } catch (err) {
        logger.error("Form submission error:", err);
        res.status(500).json({ error: "Form submission failed" });
    }
};

// Cancel/Delete temp file
export const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await TempFile.findById(fileId);

        if (!file) return res.status(404).json({ error: "File not found" });
        if (file.status !== "temp") return res.status(400).json({ error: "Cannot delete non-temporary file" });

        // Delete from S3
        try {
            await deleteObject(file.s3Filename); // should throw on failure
        } catch (s3Err) {
            logger.error("Failed to delete file from S3:", s3Err);
            return res.status(500).json({ error: "Failed to delete file from S3" });
        }

        // Delete MongoDB record
        await TempFile.deleteOne({ _id: file._id });

        res.status(200).json({ success: true, message: "File deleted successfully" });
    } catch (err) {
        logger.error("Delete file error:", err);
        res.status(500).json({ error: "File deletion failed" });
    }
};

export const download = async (req, res) => {
    try {
        const { fileName } = req.params;

        if (!fileName) return res.status(400).json({ error: "Missing file name" });

        // Generate pre-signed URL valid for 5 minutes
        const url = await getObjectUrl(fileName, 300);

        res.status(200).json({ success: true, url });
    } catch (err) {
        console.error("Download error:", err);
        res.status(500).json({ error: "Failed to generate download URL" });
    }
}
// Get file status
export const getFileStatus = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await TempFile.findById(fileId);
        if (!file) return res.status(404).json({ error: "File not found" });

        res.json({
            fileId: file._id,
            status: file.status,
            s3Filename: file.s3Filename,
            originalName: file.originalName,
            addDate: file.addDate,
        });
    } catch (err) {
        logger.error("Status check error:", err);
        res.status(500).json({ error: "Status check failed" });
    }
};
