import { v4 as uuidv4 } from "uuid";
import { putObject, deleteObject } from "../utils/s3Helpers.js";
import TempFile from "../models/tempFile.js";
import crypto from "crypto";
import path from "path";
// Unique filename generator
function generateUniqueFileName(originalName) {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const id = crypto.randomBytes(8).toString("hex");
    return `${base}_${id}${ext}`;
}

// Upload temporary file
export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { originalname, mimetype, buffer, path: localPath } = req.file;
        const s3Filename = generateUniqueFileName(originalname);

        // Upload to S3
        const { url, key } = await putObject(buffer, s3Filename, mimetype);
        // Delete local file if using diskStorage
        if (localPath && fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }

        // Save in DB
        const tempFile = await TempFile.create({
            fileName: originalname,
            originalName: originalname,
            s3Filename: key,
            fileType: mimetype,
            status: "temp",
        });

        res.json({
            success: true,
            message: "File uploaded temporarily",
            fileId: tempFile._id,
            s3Filename: key,
            s3Url: url,
            temp: true,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "File upload failed" });
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
        console.error("Form submission error:", err);
        res.status(500).json({ error: "Form submission failed" });
    }
};

// Cancel/Delete temp file
export const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await TempFile.findById(fileId);

        if (!file) return res.status(404).json({ error: "File not found" });

        if (file.status === "temp") {
            // Delete from S3
            const result = await deleteObject(file.s3Filename);
            if (result.status !== 204) {
                return res.status(500).json({ error: "Failed to delete file from S3" });
            }

            await TempFile.deleteOne({ _id: file._id });
            // Delete from local disk (if any)
            if (file.localPath && fs.existsSync(file.localPath)) {
                fs.unlinkSync(file.localPath);
            }


            res.json({ success: true, message: "File deleted successfully" });
        } else {
            res.status(400).json({ error: "Cannot delete non-temporary file" });
        }
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "File deletion failed" });
    }
};

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
        console.error("Status check error:", err);
        res.status(500).json({ error: "Status check failed" });
    }
};
