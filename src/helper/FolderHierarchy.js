import Folder from '../models/Folder.js';

/**
 * Ensure that a nested folder path exists under a parent folder.
 * Returns the _id of the deepest folder in the path.
 * 
 * @param {string} folderPath - e.g., "sub1/sub2"
 * @param {Object} parentFolder - parent folder document
 * @param {Map} folderMap - map of folderPath => folderId
 * @param {string} ownerId - uploader ID
 * @returns {Promise<string>} folderId
 */
export const ensureFolderHierarchy = async (folderPath, parentFolder, folderMap, ownerId) => {
    if (!folderPath || folderPath === ".") return parentFolder._id;

    const parts = folderPath.split("/");

    let currentPath = "";
    let currentParentId = parentFolder._id;

    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (folderMap.has(currentPath)) {
            currentParentId = folderMap.get(currentPath);
            continue;
        }

        // Check if folder exists under current parent
        let folder = await Folder.findOne({
            name: part,
            parentId: currentParentId,
            projectId: parentFolder.projectId,
            departmentId: parentFolder.departmentId,
        });

        if (!folder) {
            folder = await Folder.create({
                name: part,
                parentId: currentParentId,
                projectId: parentFolder.projectId,
                departmentId: parentFolder.departmentId,
                uploadedBy: ownerId,
                files: [],
                size: 0
            });
        }

        folderMap.set(currentPath, folder._id);
        currentParentId = folder._id;
    }

    return currentParentId;
};
