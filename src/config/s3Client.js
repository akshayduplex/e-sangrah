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
