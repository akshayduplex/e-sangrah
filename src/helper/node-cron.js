import cron from 'node-cron';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import TempFile from '../models/tempFile.js';
import { s3 } from '../config/s3Client.js';

let isRunning = false;

const cleanupJob = () => {
    cron.schedule('0 */2 * * *', async () => {
        if (isRunning) {
            console.log('Cleanup job is already running');
            return;
        }

        isRunning = true;
        console.log('🧹 Starting temporary files cleanup job...');

        try {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

            const oldFiles = await TempFile.find({
                status: 'temp',
                addedDate: { $lt: twoHoursAgo }
            });

            if (oldFiles.length === 0) {
                console.log('No old files to clean up');
                isRunning = false;
                return;
            }

            console.log(`Found ${oldFiles.length} temporary files to clean up`);

            // Collect S3 keys for files that have s3FileName
            // const objectsToDelete = oldFiles
            //     .filter(file => file.s3FileName)
            //     .map(file => ({ Key: file.s3FileName }));

            // Batch delete from S3 if there are objects to delete
            // if (objectsToDelete.length > 0) {
            //     try {
            //         await s3.send(new DeleteObjectsCommand({
            //             Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET,
            //             Delete: { Objects: objectsToDelete },
            //         }));
            //         console.log(`Deleted ${objectsToDelete.length} files from S3`);
            //     } catch (s3Error) {
            //         console.error('Error deleting files from S3:', s3Error);
            //     }
            // }

            // Delete from DB in bulk
            const deleteResult = await TempFile.deleteMany({
                _id: { $in: oldFiles.map(f => f._id) }
            });

            console.log(`🧹 Cleaned up ${deleteResult.deletedCount} temporary files from database`);
        } catch (error) {
            console.error('Error in cleanup job:', error);
        } finally {
            isRunning = false;
        }
    });

    console.log('✅ Cleanup job scheduled to run every 2 hours');
};

export default cleanupJob;