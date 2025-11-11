import cron from "node-cron";
import TempFile from "../models/TempFile.js";
import PermissionLogs from "../models/PermissionLogs.js";
import FolderPermissionLogs from "../models/FolderPermissionLogs.js";
import { deleteObject } from "../utils/s3Helpers.js";
import logger from "../utils/logger.js";

let isRunningTempFiles = false;
let isRunningLogs = false;

/* ----------------------------
  Temp files cleanup
---------------------------- */
const cleanupTempFiles = async () => {
    if (isRunningTempFiles) {
        logger.warn("Temp file cleanup skipped: previous run still in progress.");
        return;
    }
    isRunningTempFiles = true;

    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const oldFiles = await TempFile.find({ status: "temp", addDate: { $lt: twoHoursAgo } });

        for (const file of oldFiles) {
            try {
                await deleteObject(file.s3Filename);
                await TempFile.deleteOne({ _id: file._id });
                logger.info(`Deleted temp file: ${file.s3Filename}`);
            } catch (err) {
                logger.error(`Failed to delete file ${file.s3Filename}:`, err);
            }
        }

        if (oldFiles.length > 0) {
            logger.info(`Temp file cleanup complete. ${oldFiles.length} files removed.`);
        } else {
            logger.info("Temp file cleanup complete. No files to remove.");
        }
    } catch (err) {
        logger.error("Temp file cleanup failed:", err);
    } finally {
        isRunningTempFiles = false;
    }
};

/* ----------------------------
  PermissionLogs cleanup
---------------------------- */
const cleanupPermissionLogs = async () => {
    const now = new Date();
    const result = await PermissionLogs.deleteMany({ expiresAt: { $lt: now } });
    logger.info(`Permission log cleanup complete. ${result.deletedCount} expired logs removed.`);
};

/* ----------------------------
  FolderPermissionLogs cleanup
---------------------------- */
const cleanupFolderPermissionLogs = async () => {
    const now = new Date();
    const result = await FolderPermissionLogs.deleteMany({ expiresAt: { $lt: now } });
    logger.info(`Folder permission log cleanup complete. ${result.deletedCount} expired logs removed.`);
};

/* ----------------------------
  Combined logs cleanup runner
---------------------------- */
const runLogsCleanup = async () => {
    if (isRunningLogs) {
        logger.warn("Logs cleanup skipped: previous run still in progress.");
        return;
    }

    isRunningLogs = true;
    const startTime = new Date();
    logger.info(`[${startTime.toISOString()}] Permission logs cleanup job started.`);

    try {
        await cleanupPermissionLogs();
        await cleanupFolderPermissionLogs();
    } catch (err) {
        logger.error("Logs cleanup job failed:", err);
    } finally {
        const endTime = new Date();
        logger.info(`[${endTime.toISOString()}] Permission logs cleanup job finished. Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);
        isRunningLogs = false;
    }
};

/* ----------------------------
  Start scheduled jobs
---------------------------- */
export const startCleanupJob = () => {
    logger.info("Scheduling cleanup cron jobs...");

    // Temp files: every 2 hours on the hour
    cron.schedule(
        "0 */2 * * *",
        async () => {
            logger.info("Triggering temp file cleanup...");
            await cleanupTempFiles();
        },
        { scheduled: true, timezone: "UTC" }
    );

    // PermissionLogs and FolderPermissionLogs: daily at midnight UTC
    cron.schedule(
        "0 0 * * *",
        async () => {
            logger.info("Triggering permission logs cleanup...");
            await runLogsCleanup();
        },
        { scheduled: true, timezone: "UTC" }
    );
};
