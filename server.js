require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { connectDB } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});
