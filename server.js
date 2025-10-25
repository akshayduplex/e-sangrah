import http from "http";
import app from "./src/app.js";
import logger from "./src/utils/logger.js";
import { API_CONFIG } from "./src/config/ApiEndpoints.js";

const PORT = API_CONFIG.PORT || 5000;

const server = http.createServer(app);
server.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`));

process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    process.exit(1);
});
