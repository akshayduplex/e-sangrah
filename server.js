import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

const PORT = process.env.PORT || 5000;

connectDB()

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});
