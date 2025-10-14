import File from "../models/File.js";
import Folder from "../models/Folder.js";
import { s3Client } from "../config/S3Client.js";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
// Add this route to serve PDF files with correct headers
export const servePDF = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).send('File not found');
        }

        // Get the file from S3
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: file.file,
        });

        const response = await s3Client.send(command);

        // Set proper headers for PDF display
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
        res.setHeader('Content-Length', response.ContentLength);

        // Stream the file
        response.Body.pipe(res);

    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).send('Error loading PDF');
    }
};

export const downloadFolderAsZip = async (req, res) => {
    try {
        const { folderId } = req.params;

        // 1. Find folder in DB
        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ message: "Folder not found" });

        const folderName = folder.slug;

        // 2. List all files in S3 folder
        const listParams = {
            Bucket: process.env.AWS_BUCKET,
            Prefix: `folders/${folderName}/`,
        };

        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(404).json({ message: "No files in folder" });
        }

        // 3. Set up ZIP response
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=${folderName}.zip`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
            console.error("Archive error:", err);
            res.status(500).send({ message: "Error creating ZIP" });
        });
        archive.pipe(res);

        // 4. Concurrency queue for downloading files
        const concurrency = 5; // adjust based on server capacity
        const queue = new PQueue({ concurrency });

        // 5. Add tasks for each file
        listedObjects.Contents.forEach((file) => {
            queue.add(async () => {
                // Generate pre-signed URL
                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Key: file.Key,
                });
                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

                // Fetch file stream via Axios
                const response = await axios({
                    method: "GET",
                    url: signedUrl,
                    responseType: "stream",
                });

                // Append file to ZIP
                archive.append(response.data, {
                    name: file.Key.replace(`folders/${folderName}/`, ""),
                });
            });
        });

        // 6. Wait for all downloads to finish
        await queue.onIdle();
        await archive.finalize();

    } catch (error) {
        console.error("Download ZIP error:", error);
        return res.status(500).json({ message: "Failed to download folder" });
    }
};