import path from 'path'
import crypto from 'crypto'
export function generateUniqueFileName(originalName) {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const id = crypto.randomBytes(8).toString("hex");
    return `${base}_${id}${ext}`;
}