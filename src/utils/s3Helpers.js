import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3Client.js";

export const putObject = async (fileBuffer, fileName, contentType) => {
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `file-temp-uploads/${fileName}`, // 👈 upload inside folder
        Body: fileBuffer,
        ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 200) {
        throw new Error("S3 upload failed");
    }

    const url = `${process.env.AWS_URL}file-temp-uploads/${fileName}`;
    return { url, key: `file-temp-uploads/${fileName}` };
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

