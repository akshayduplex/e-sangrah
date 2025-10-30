import FolderPermissionLogs from "../models/FolderPermissionLogs.js";

export default async function checkFolderAccess(folder, req) {
    const now = new Date();

    const result = {
        canView: false,
        canRequestAccess: false,
        folderExpired: false,
        isExternal: false,
        reason: "none"
    };

    try {
        // Owner bypass
        if (req.user && String(folder.owner) === String(req.user._id)) {
            return { ...result, canView: true, reason: "owner" };
        }

        // Token-based access
        const token = req.query?.token || req.body?.token;
        if (token) {
            const link = folder.metadata?.shareLinks?.find(l => l.token === token);
            if (link && (!link.expiresAt || new Date(link.expiresAt) > now)) {
                return { ...result, canView: true, reason: "token" };
            }
        }

        // Internal user access
        if (req.user) {
            const permission = folder.permissions?.find(
                p => String(p.principal) === String(req.user._id)
            );

            if (permission) {
                const valid =
                    (!permission.expiresAt || new Date(permission.expiresAt) > now) &&
                    (!permission.customEnd || new Date(permission.customEnd) > now);

                if (valid) {
                    return { ...result, canView: true, reason: "internal_permission" };
                }
            }
        }

        // External user access
        if (req.user?.email) {
            const log = await FolderPermissionLogs.findOne({
                "user.email": req.user.email,
                folder: folder._id,
                requestStatus: "approved",
                isExternal: true
            }).lean();

            if (log) {
                const valid = !log.expiresAt || new Date(log.expiresAt) > now;
                if (valid) {
                    return { ...result, canView: true, isExternal: true, reason: "external_permission" };
                } else {
                    return { ...result, folderExpired: true, isExternal: true, reason: "external_expired" };
                }
            }
        }

        // Folder expired
        const folderExpired = folder.expiresAt && new Date(folder.expiresAt) <= now;
        if (folderExpired) {
            return { ...result, folderExpired: true, reason: "folder_expired" };
        }

        // Default: can request
        return { ...result, canRequestAccess: true, reason: "request_access" };

    } catch (err) {
        return result;
    }
}
