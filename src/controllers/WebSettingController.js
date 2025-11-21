import { API_CONFIG } from "../config/ApiEndpoints.js";
import WebSetting from "../models/WebSetting.js";
import { deleteObject, folderUpload } from "../utils/s3Helpers.js";

export const extractS3Key = (url) => {
    if (!url) return null;
    const parts = url.split(".com/");
    return parts[1] || null;
};

export const updateWebSettings = async (req, res) => {
    try {
        let settings = await WebSetting.findOne() || new WebSetting();
        const files = req.files;
        const timestamp = Date.now();

        if (files?.logo) {
            if (settings.logoKey) await deleteObject(settings.logoKey);
            const uploaded = await folderUpload(files.logo[0].buffer, `logo_${timestamp}_${files.logo[0].originalname}`, files.logo[0].mimetype, "public/images/logo");
            settings.logo = uploaded.url;
            settings.logoKey = uploaded.key;
        }

        if (files?.favicon) {
            if (settings.faviconKey) await deleteObject(settings.faviconKey);
            const uploaded = await folderUpload(files.favicon[0].buffer, `favicon_${timestamp}_${files.favicon[0].originalname}`, files.favicon[0].mimetype, "public/images/favicon");
            settings.favicon = uploaded.url;
            settings.faviconKey = uploaded.key;
        }

        if (files?.banner) {
            if (settings.bannerKey) await deleteObject(settings.bannerKey);
            const uploaded = await folderUpload(files.banner[0].buffer, `banner_${timestamp}_${files.banner[0].originalname}`, files.banner[0].mimetype, "public/images/banner");
            settings.banner = uploaded.url;
            settings.bannerKey = uploaded.key;
        }

        await settings.save();

        return res.json({ success: true, message: "Web settings updated successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Error updating settings" });
    }
};



export const getWebSettings = async (req, res) => {
    try {
        const setting = await WebSetting.findOne();
        return res.status(200).json({
            success: true,
            data: setting
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const loadWebSettings = async () => {
    try {
        const setting = await WebSetting.findOne();
        if (setting) {
            API_CONFIG.LOGO_URL = setting.logo || null;
            API_CONFIG.EMAIL_BANNER = setting.banner || null;
        }
    } catch (err) {
        console.error("Failed to load web settings:", err.message);
    }
};