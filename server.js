import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // for development, restrict in production
        methods: ["GET", "POST"],
    },
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log("✅ New client connected:", socket.id);

    // Example event listener
    socket.on("send-notification", (data) => {
        console.log("📩 Notification received from client:", data);

        // Broadcast notification to everyone
        io.emit("notification", {
            message: data.message,
            timestamp: new Date(),
        });
    });

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

// Make `io` available in routes/controllers
app.set("io", io);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Error handling
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});
