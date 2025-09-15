import crypto from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import TempFile from '../models/tempFile.js';
import { s3 } from '../config/s3Client.js'; // Fixed import

// Create temp file record
export const createTempFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Generate a unique "S3-like" name if you want, or just use local name
        const uniqueFileName = `${crypto.randomUUID()}_${req.file.originalname}`;

        const tempFile = new TempFile({
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            s3FileName: uniqueFileName,
            fileSize: req.file.size,
            localPath: req.file.path, // save local path
            status: 'temp'
        });

        await tempFile.save();

        res.json({ success: true, id: tempFile._id });
    } catch (error) {
        console.error('Error creating temp file record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get presigned upload URL
export const getPresignedUrl = async (req, res) => {
    try {

        const { fileId } = req.params;

        const tempFile = await TempFile.findById(fileId);
        if (!tempFile) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET,
            Key: tempFile.s3FileName,
            ContentType: tempFile.fileType,
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        res.json({ success: true, url: presignedUrl });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update temp file status
export const updateTempFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { status } = req.body;

        const tempFile = await TempFile.findByIdAndUpdate(
            fileId,
            { status },
            { new: true }
        );

        if (!tempFile) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating temp file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete temp file
export const deleteTempFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const tempFile = await TempFile.findById(fileId);
        if (!tempFile) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // If file was already uploaded to S3, delete it
        if (tempFile.status === 'uploaded' && tempFile.s3FileName) {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET,
                    Key: tempFile.s3FileName,
                });

                await s3.send(command);
            } catch (s3Error) {
                console.error('Error deleting from S3:', s3Error);
                // Continue with DB deletion even if S3 deletion fails
            }
        }

        await TempFile.findByIdAndDelete(fileId);

        res.json({ success: true, message: 'Temporary file deleted successfully' });
    } catch (error) {
        console.error('Error deleting temp file:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};