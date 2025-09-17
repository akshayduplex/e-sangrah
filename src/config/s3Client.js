// import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
// import fs from "fs";
// import path from "path";

// export const s3 = new S3Client({
//     region: process.env.AWS_REGION || "ap-south-1",
//     credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     },
// });

// // ✅ Single file uploader (reusable)
// export async function uploadFile(localPath, remotePath, contentType = "application/octet-stream") {
//     const fileStream = fs.createReadStream(localPath);

//     const uploadParams = {
//         Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET,
//         Key: remotePath,
//         Body: fileStream,
//         ContentType: contentType,
//     };

//     try {
//         const data = await s3.send(new PutObjectCommand(uploadParams));
//         console.log(`Uploaded: ${remotePath}`);
//         return data;
//     } catch (err) {
//         console.error(`Failed to upload ${localPath}:`, err.message);
//         throw err;
//     }
// }

// // Multiple file uploader (uploads everything in a folder)
// export async function uploadFolder(localFolder, s3Folder = "") {
//     const files = fs.readdirSync(localFolder);

//     const uploadPromises = files.map((file) => {
//         const localPath = path.join(localFolder, file);
//         const remotePath = path.join(s3Folder, file).replace(/\\/g, "/"); // fix for Windows paths

//         // Guess content type (optional improvement)
//         const contentType = file.endsWith(".txt")
//             ? "text/plain"
//             : file.endsWith(".json")
//                 ? "application/json"
//                 : file.endsWith(".jpg") || file.endsWith(".jpeg")
//                     ? "image/jpeg"
//                     : file.endsWith(".png")
//                         ? "image/png"
//                         : file.endsWith(".pdf")
//                             ? "application/pdf"
//                             : "application/octet-stream";

//         return uploadFile(localPath, remotePath, contentType);
//     });

//     // Run uploads in parallel
//     await Promise.all(uploadPromises);
//     console.log("All files uploaded successfully!");
// }
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();
// console.log("AWS", process.env.AWS_DEFAULT_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.AWS_ENDPOINT)
export const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    endpoint: process.env.AWS_ENDPOINT || undefined, // optional if using custom endpoint
});
