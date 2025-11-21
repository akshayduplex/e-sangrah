import multer from "multer";

const storage = multer.memoryStorage();

export const uploadWebImages = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "banner", maxCount: 1 }
]);
