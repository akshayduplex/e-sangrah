import Designation from "../models/Designation.js";
import Document from "../models/Document.js";
import File from "../models/File.js";
import Project from "../models/Project.js";
import WebSetting from "../models/WebSetting.js";

// Helper to pick an icon for each file type (optional)
export const getFileIcon = (file) => {
    if (!file) return "/img/icons/file.png";

    const type = file.fileType?.toLowerCase() || "";
    if (type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("gif")) {
        if (file.s3Url) return file.s3Url;
        return `/uploads/${file.file}`;
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

export async function toProperCase(str = "") {
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

export const getGrowth = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : 0;

    let growth = Math.round(((cur - prev) / prev) * 100);

    if (growth > 100) growth = 100;
    if (growth < -100) growth = -100;

    return growth;
};

export async function getDesignationId(profile_type) {
    const names = profile_type === "vendor" ? ["vendor", "vendors"] : ["donor", "donors"];
    const designation = await Designation.findOne({
        name: { $in: names.map(n => new RegExp(`^${n}$`, "i")) },
        status: "Active"
    });
    if (!designation) throw new Error(`No active designation found for ${profile_type}`);
    return designation._id;
}

export async function getDateRange(filter) {
    const now = new Date();

    switch (filter) {
        case "today": {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        case "week": {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);

            return { start, end: now };
        }

        case "month": {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        case "year": {
            const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        default:
            return null;
    }
};
