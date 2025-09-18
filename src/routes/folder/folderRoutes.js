// routes/folderRoutes.js
import express from 'express';
import { createFolder, deleteFolder, listFolders, moveFolder, renameFolder } from '../../controllers/Folder/folderController.js';

const router = express.Router();

// Create folder
router.post('/', createFolder);

// List folders (optionally by parent)
router.get('/:parentId?', listFolders);

// Rename folder
router.post('/:id/rename', renameFolder);

// Move folder
router.post('/:id/move', moveFolder);

// Delete folder
router.post('/:id/delete', deleteFolder);

// Export router as default
export default router;
