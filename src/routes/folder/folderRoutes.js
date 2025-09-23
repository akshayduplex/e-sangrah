// routes/folderRoutes.js
import express from 'express';
import {
    createFolder,
    deleteFolder,
    listFolders,
    moveFolder,
    renameFolder,
    getFolder,
    uploadToFolder,
    getFolderTree,
    getAllFolders,
    archiveFolder,
    restoreFolder,
    getArchivedFolders
} from '../../controllers/Folder/folderController.js';
import { authenticate } from '../../middlewares/authMiddleware.js';
import multer from 'multer';
// Multer memory storage (for direct S3 upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {}, // 10MB
});

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Create folder
router.post('/', createFolder);

// List folders (optionally by parent)
router.get('/', listFolders);
router.get('/all', getAllFolders);

// Get folder details with contents
router.get('/details/:id', getFolder);

// Rename folder
router.patch('/:id/rename', renameFolder);

// Move folder
router.patch('/:id/move', moveFolder);

// Delete folder (soft delete)
router.delete('/:id', deleteFolder);

// Upload files to folder
router.post('/:folderId/upload', upload.array("files"), uploadToFolder);

// Get folder tree structure
router.get('/tree/structure', getFolderTree);

router.patch('/:id/archive', archiveFolder);
// Get all archived folders for the current user
router.get('/archived', getArchivedFolders);

router.patch('/:id/restore', restoreFolder);

// Export router as default
export default router;