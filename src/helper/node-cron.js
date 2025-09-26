import cron from "node-cron";
import TempFile from "../models/tempFile.js";
import { deleteObject } from "../utils/s3Helpers.js";
import logger from "../utils/logger.js";

// Function to cleanup old temp files
export const cleanupOldTempFiles = async () => {
    try {
        // delete files older than 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const oldFiles = await TempFile.find({
            status: "temp",
            addDate: { $lt: twoHoursAgo },
        });

        for (const file of oldFiles) {
            try {
                // Delete from S3
                await deleteObject(file.s3Filename);

                //Remove from DB completely
                await TempFile.deleteOne({ _id: file._id });

                logger.info(`Permanently deleted file: ${file.s3Filename}`);
            } catch (err) {
                logger.error(`Failed to delete file ${file.s3Filename}:`, err);
            }
        }

        logger.info(`🧹 Cleanup complete. ${oldFiles.length} files permanently removed.`);
        return oldFiles.length;
    } catch (err) {
        logger.error("Cleanup error:", err);
        return 0;
    }
};

// Schedule cron job to run every 2 hours
export const startCleanupJob = () => {
    // runs at minute 0, every 2nd hour
    cron.schedule("0 */2 * * *", async () => {
        console.log(" Running cleanup job...");
        await cleanupOldTempFiles();
    });
    console.log(" Cleanup cron job scheduled (runs every 2 hours)");
};
