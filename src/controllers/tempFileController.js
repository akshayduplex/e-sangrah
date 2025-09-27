import fs from "fs"
import { putObject, deleteObject, getObjectUrl } from "../utils/s3Helpers.js";
import TempFile from "../models/tempFile.js";
import crypto from "crypto";
import path from "path";
import Folder from "../models/Folder.js";
import { generateUniqueFileName } from "../helper/generateUniquename.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
// Unique filename generator

// Upload temporary file
export const uploadFile = async (req, res) => {
    try {
        const { folderId } = req.params;
        const ownerId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({ success: false, message: "Invalid folder ID" });
        }

        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ success: false, message: "Folder not found" });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No files uploaded" });

        let totalSize = 0;
        const uploadedFiles = [];

        for (const file of req.files) {
            const { originalname, mimetype, size, key, location } = file;

            const tempFile = await TempFile.create({
                fileName: key,
                originalName: originalname,
                s3Filename: key,
                s3Url: location,
                fileType: mimetype,
                status: "temp",
                size: size || 0,
            });

            if (!folder.files) folder.files = [];
            folder.files.push({
                file: key,
                originalName: originalname,
                fileType: mimetype,
                size: size || 0,
                uploadedBy: ownerId,
            });

            totalSize += size || 0;

            uploadedFiles.push({
                fileId: tempFile._id,
                originalName: originalname,
                s3Filename: key,
                s3Url: location,
            });
        }

        folder.size += totalSize;
        await folder.save();

        return res.status(201).json({
            success: true,
            message: "Files uploaded successfully",
            folderId: folder._id,
            files: uploadedFiles,
        });
    } catch (err) {
        logger.error("Upload to folder error:", err);
        return res.status(500).json({ success: false, message: "File upload failed" });
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
