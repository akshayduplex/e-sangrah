// // import multer from "multer";
// // import path from "path";
// // import fs from "fs";

// // const storage = multer.diskStorage({
// //     destination: function (req, file, cb) {
// //         const uploadPath = `uploads/${req.uploadFolder || 'general'}`; // Dynamic upload folder, outside public
// //         fs.mkdirSync(uploadPath, { recursive: true }); // Create folder if it doesn't exist
// //         cb(null, uploadPath);
// //     },
// //     filename: function (req, file, cb) {
// //         cb(null, Date.now() + "-" + file.originalname);
// //     },
// // });

// // const fileFilter = (req, file, cb) => {
// //     const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
// //     const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
// //     const mimetype = allowedTypes.test(file.mimetype);

// //     if (mimetype && extname) {
// //         return cb(null, true);
// //     } else {
// //         cb("Error: Files Only!");
// //     }
// // };

// // export const upload = multer({
// //     storage: storage,
// //     limits: { fileSize: 1024 * 1024 * 10 }, // 10MB limit
// //     fileFilter: fileFilter,
// // });

// // config/multer.js
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// const uploadsDir = path.resolve('uploads');
// if (!fs.existsSync(uploadsDir)) {
//     fs.mkdirSync(uploadsDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, uploadsDir),
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage,
//     limits: { fileSize: 10 * 1024 * 1024 } // 10MB
// });

// export default upload;

// config/multer.js
// config/multer.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage engine
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: req.uploadFolder || 'general', // dynamic folder
        public_id: Date.now() + '-' + file.originalname.split('.')[0], // unique ID
    }),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export default upload;
export { cloudinary };
