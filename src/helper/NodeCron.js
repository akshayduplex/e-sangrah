import cron from "node-cron";
import TempFile from "../models/TempFile.js";
import PermissionLogs from "../models/PermissionLogs.js";
import { deleteObject } from "../utils/s3Helpers.js";
import logger from "../utils/logger.js";

/* -------------------------------
TEMP FILE CLEANUP (every 2 hours)
--------------------------------*/
export const cleanupOldTempFiles = async () => {
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const oldFiles = await TempFile.find({
            status: "temp",
            addDate: { $lt: twoHoursAgo },
        });

        for (const file of oldFiles) {
            try {
                await deleteObject(file.s3Filename);
                await TempFile.deleteOne({ _id: file._id });
                logger.info(`Permanently deleted file: ${file.s3Filename}`);
            } catch (err) {
                logger.error(`Failed to delete file ${file.s3Filename}:`, err);
            }
        }

        logger.info(`Temp file cleanup complete. ${oldFiles.length} files removed.`);
        return oldFiles.length;
    } catch (err) {
        logger.error("Temp file cleanup error:", err);
        return 0;
    }
};

/* -------------------------------
   PERMISSION LOG CLEANUP (every day at midnight)
--------------------------------*/
export const cleanupExpiredPermissionLogs = async () => {
    try {
        const now = new Date();
        // Assuming your PermissionLogs model has an `expiresAt` field
        const result = await PermissionLogs.deleteMany({ expiresAt: { $lt: now } });

        logger.info(`Permission log cleanup complete. ${result.deletedCount} expired logs removed.`);
        return result.deletedCount;
    } catch (err) {
        logger.error("Permission log cleanup error:", err);
        return 0;
    }
};

/* -------------------------------
    START ALL CRON JOBS
--------------------------------*/
export const startCleanupJob = () => {
    // Temp files: every 2 hours
    cron.schedule("0 */2 * * *", async () => {
        console.log("Running temp file cleanup job...");
        await cleanupOldTempFiles();
    });

    // Permission logs: every day at midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("Running permission log cleanup job...");
        await cleanupExpiredPermissionLogs();
    });
};
