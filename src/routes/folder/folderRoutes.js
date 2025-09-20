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
    getFolderTree
} from '../../controllers/Folder/folderController.js';
import { authenticate } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Create folder
router.post('/', createFolder);

// List folders (optionally by parent)
router.get('/', listFolders);

// Get folder details with contents
router.get('/details/:id', getFolder);

// Rename folder
router.patch('/:id/rename', renameFolder);

// Move folder
router.patch('/:id/move', moveFolder);

// Delete folder (soft delete)
router.delete('/:id', deleteFolder);

// Upload files to folder
router.post('/:id/upload', uploadToFolder);

// Get folder tree structure
router.get('/tree/structure', getFolderTree);

// Export router as default
export default router;