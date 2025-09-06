const uploadFileToGridFS = (bucket, file, userId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(file.originalname, {
            contentType: file.mimetype,
            metadata: { uploadedBy: userId }
        });
        uploadStream.end(file.buffer);

        uploadStream.on("finish", () => {
            resolve({
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                gridfsId: uploadStream.id,
                uploadedBy: userId
            });
        });

        uploadStream.on("error", reject);
    });
};

module.exports = uploadFileToGridFS;