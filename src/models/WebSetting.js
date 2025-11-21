import mongoose from "mongoose";

const WebSettingSchema = new mongoose.Schema({
    logo: String,
    logoKey: String,

    favicon: String,
    faviconKey: String,

    banner: String,
    bannerKey: String,
}, { timestamps: true });

export default mongoose.model("WebSetting", WebSettingSchema);
