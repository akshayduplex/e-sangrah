// controllers/folderController.js
import Folder from '../../models/Folder.js';

// Create folder
export const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const ownerId = req.user._id;
        const folder = new Folder({ name, parent: parentId || null, owner: ownerId });
        await folder.save();
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// List folders
export const listFolders = async (req, res) => {
    try {
        const parentId = req.params.parentId || null;
        const folders = await Folder.find({ parent: parentId, deleted: false });
        res.render('folders/list', { folders });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Rename folder
export const renameFolder = async (req, res) => {
    try {
        const { name } = req.body;
        await Folder.findByIdAndUpdate(req.params.id, { name, updatedAt: Date.now() });
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Move folder
export const moveFolder = async (req, res) => {
    try {
        const { newParentId } = req.body;
        const folder = await Folder.findById(req.params.id);
        if (!folder) return res.status(404).send('Folder not found');

        folder.parent = newParentId || null;
        await folder.save();
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Delete folder (soft delete)
export const deleteFolder = async (req, res) => {
    try {
        await Folder.findByIdAndUpdate(req.params.id, { deleted: true, updatedAt: Date.now() });
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
