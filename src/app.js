import "dotenv/config";
import express from "express";
import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import methodOverride from "method-override";
import bodyParser from "body-parser";
import ApiRoutes from "./routes/apiRoutes.js";
import pageRoutes from "./routes/webRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { formatDateDDMMYYYY } from "./utils/formatDate.js";
import { startCleanupJob } from "./helper/node-cron.js";
import logger from "./utils/logger.js";
import { connectDB } from "./database/db.js";
import checkPermissions, { loadMenuMap } from './middlewares/checkPermission.js';
import fs from "fs";

const app = express();

(async () => {
    // Connect to MongoDB
    await connectDB();

    // Load menu map into memory (for fast RBAC lookup)
    await loadMenuMap();

    //Security middlewares
    app.use(helmet({ contentSecurityPolicy: false }));

    //  Logging
    const logDir = path.resolve(process.cwd(), "logs");
    const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });
    if (process.env.NODE_ENV === "development") {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined", { stream: accessLogStream }));
    }

    // Body parser & method override
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(methodOverride("_method"));

    // Compression
    app.use(compression());
    console.log("Mongo URL", process.env.MONGO_URI, process.env.SESSION_SECRET);
    // Sessions (must be before RBAC middleware)
    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGO_URI,
                collectionName: "sessions",
                ttl: 60 * 60, // 1 hour
            }),
            cookie: {
                maxAge: 1000 * 60 * 60,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            },
        })
    );

    // Flash messages
    app.use(flash());

    //  Views and static files
    app.set("view engine", "ejs");
    app.set("views", path.resolve("views"));
    app.use(express.static(path.resolve("public")));

    // 🔹 Global locals
    app.use((req, res, next) => {
        const user = req.user || req.session.user || {};
        res.locals.BASE_URL = process.env.BASE_URL || "";
        res.locals.designation_id = user.designation_id || null;
        res.locals.department = user.department || null;
        res.locals.profile_image = user.profile_image || null;
        res.locals.profile_type = user.profile_type || null;
        res.locals.email = user.email || null;
        res.locals.name = user.name || null;
        res.locals.todayDate = formatDateDDMMYYYY();
        next();
    });

    // Test route for sessions (optional)
    app.get("/test-session", (req, res) => {
        req.session.test = "hello";
        res.json(req.session);
    });

    //  Routes with RBAC middleware
    app.use("/api", ApiRoutes);
    app.use("/", pageRoutes);

    //  Start cleanup cron job
    startCleanupJob();

    // Error handling
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();

export default app;