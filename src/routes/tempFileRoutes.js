import express from 'express';
import {
    createTempFile,
    getPresignedUrl,
    updateTempFile,
    deleteTempFile
} from '../controllers/tempFileController.js';
import upload from '../middlewares/fileUploads.js';

const router = express.Router();

router.post('/temp-files', upload.single('file'), createTempFile);
router.get('/presigned-url/:fileId', getPresignedUrl);
router.patch('/temp-files/:fileId', updateTempFile);
router.delete('/temp-files/:fileId', deleteTempFile);

export default router;