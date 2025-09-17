import cron from "node-cron";
import TempFile from "../models/tempFile.js";
import { deleteObject } from "../utils/s3Helpers.js";

// Function to cleanup old temp files
export const cleanupOldTempFiles = async () => {
    try {
        // for real use: 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // for testing: 2 minutes
        // const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const oldFiles = await TempFile.find({
            status: "temp",
            addDate: { $lt: twoMinutesAgo },
        });

        for (const file of oldFiles) {
            try {
                // 1️⃣ Delete from S3
                await deleteObject(file.s3Filename);

                // 2️⃣ Remove from DB completely
                await TempFile.deleteOne({ _id: file._id });

                console.log(`🗑️ Permanently deleted file: ${file.s3Filename}`);
            } catch (err) {
                console.error(`❌ Failed to delete file ${file.s3Filename}:`, err);
            }
        }

        console.log(`🧹 Cleanup complete. ${oldFiles.length} files permanently removed.`);
        return oldFiles.length;
    } catch (err) {
        console.error("❌ Cleanup error:", err);
        return 0;
    }
};

// Schedule cron job to run every 2 minutes
export const startCleanupJob = () => {
    cron.schedule("*/2 * * * *", async () => {
        console.log("⏳ Running cleanup job...");
        await cleanupOldTempFiles();
    });
    console.log("✅ Cleanup cron job scheduled (runs every 2 mins)");
};
