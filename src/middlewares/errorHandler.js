import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    // Log error with request context
    logger.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        user: req.user ? { id: req.user._id, email: req.user.email } : null,
    });

    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === "production"
            ? statusCode === 500
                ? "Internal Server Error"
                : err.message
            : err.message;

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === "production" ? null : err.errors || err.stack,
    });
};

export default errorHandler;
