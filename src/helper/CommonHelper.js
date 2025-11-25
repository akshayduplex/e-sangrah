import Document from "../models/Document.js";
import File from "../models/File.js";
import Project from "../models/Project.js";
import WebSetting from "../models/WebSetting.js";

// Helper to pick an icon for each file type (optional)
export const getFileIcon = (file) => {
    if (!file) return "/img/icons/file.png";

    const type = file.fileType?.toLowerCase() || "";

    // If original file is an image, return the real uploaded image
    if (type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("gif")) {
        if (file.s3Url) return file.s3Url;              // S3 storage
        return `/uploads/${file.file}`;                 // Local storage
    }

    // File-type icons
    if (type.includes("pdf")) return "/img/icons/fn1.png";
    if (type.includes("doc") || type.includes("word")) return "/img/icons/fn2.png";
    if (type.includes("xls") || type.includes("spreadsheet")) return "/img/icons/fn3.png";
    if (type.includes("ppt")) return "/img/icons/fn4.png";
    if (type.includes("txt")) return "/img/icons/txt.png";

    return "/img/icons/file.png";
};


export const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function toProperCase(str = "") {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/\b\w/g, ch => ch.toUpperCase())
        .replace(/\s+/g, " ")
        .trim();
}



export const recomputeProjectTotalTags = async (projectId) => {
    if (!projectId) return;

    const distinctTags = await Document.distinct("tags", { project: projectId });
    const totalFiles = await File.countDocuments({
        projectId,
        status: "active"
    });

    const cleaned = (distinctTags || [])
        .map(t => (typeof t === "string" ? t.trim().toLowerCase() : null))
        .filter(Boolean);

    const unique = [...new Set(cleaned)];
    const totalTags = unique.length;

    await Project.findByIdAndUpdate(projectId, {
        $set: { totalTags, totalFiles, tags: unique },
    }, { new: true }).exec();
};

let cachedSettings = null;

export const getCompanySettings = async () => {
    if (cachedSettings) return cachedSettings;
    cachedSettings = await WebSetting.findOne({}) || {};
    return cachedSettings;
};

export const refreshCompanySettings = async () => {
    cachedSettings = await WebSetting.findOne({}) || {};
    return cachedSettings;
};