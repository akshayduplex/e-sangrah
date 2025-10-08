import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/S3Client.js";

export const putObject = async (fileBuffer, fileName, contentType, folderName) => {
    const s3Key = `folders/${folderName}/${fileName}`;
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 200) {
        throw new Error("S3 upload failed");
    }

    // URL should also reflect the folder name
    const url = `${process.env.AWS_URL}${s3Key}`;
    return { url, key: s3Key };
};


export const deleteObject = async (key) => {
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: key,
    };

    const command = new DeleteObjectCommand(params);
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 204) {
        return { status: 400, data };
    }
    return { status: 204 };
};

export const getObjectUrl = async (key, expiresIn = 3600) => { // Increased to 1 hour
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};