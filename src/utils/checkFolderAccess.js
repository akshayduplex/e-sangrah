// utils/checkFolderAccess.js
export default function checkFolderAccess(folder, req) {
    const now = new Date();
    let canView = false;
    let folderExpired = false;
    let canRequestAccess = false;

    // Owner bypass
    if (req.user && String(folder.owner) === String(req.user._id)) {
        return { canView: true, canRequestAccess: false, folderExpired: false, reason: 'owner' };
    }

    // Token-based access
    const token = req.query?.token || req.body?.token;
    if (token) {
        const link = folder.metadata?.shareLinks?.find(l => l.token === token);
        if (link && (!link.expiresAt || new Date(link.expiresAt) > now)) {
            return { canView: true, canRequestAccess: false, folderExpired: false, reason: 'token' };
        }
    }

    // User-based direct permission
    if (req.user) {
        const permission = folder.permissions?.find(p => String(p.principal) === String(req.user._id));
        if (permission) {
            const valid =
                (!permission.expiresAt || new Date(permission.expiresAt) > now) &&
                (!permission.customEnd || new Date(permission.customEnd) > now);

            if (valid) {
                return { canView: true, canRequestAccess: false, folderExpired: false, reason: 'permission' };
            }
        }
    }

    // Folder expired check (ONLY for non-owners)
    folderExpired = folder.expiresAt && new Date(folder.expiresAt) <= now;
    if (folderExpired) {
        return { canView: false, canRequestAccess: false, folderExpired: true, reason: 'expired' };
    }

    // Can request access (not expired, but no access yet)
    canRequestAccess = true;

    return { canView, canRequestAccess, folderExpired, reason: 'request_access' };
}
