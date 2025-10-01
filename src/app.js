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

// ------------------- Async Startup -------------------
(async () => {
    // Connect to MongoDB
    console.time("MongoDB Connect");
    await connectDB();
    console.timeEnd("MongoDB Connect");

    // Security middleware
    app.use(helmet({ contentSecurityPolicy: false }));

    // Logging
    const logDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
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

    // Session setup (MongoStore with touchAfter optimization)
    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGO_URI,
                collectionName: "sessions",
                ttl: 60 * 60,          // 1 hour
                touchAfter: 24 * 3600, // avoid rewriting unchanged sessions
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

    // Views and static files
    app.set("view engine", "ejs");
    app.set("views", path.resolve("views"));
    app.use(express.static(path.resolve("public")));

    // ------------------- Global Locals -------------------
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

    // ------------------- Test Route -------------------
    app.get("/test-session", (req, res) => {
        req.session.test = "hello";
        res.json(req.session);
    });

    // ------------------- Routes -------------------
    app.use("/api", ApiRoutes);
    app.use("/", pageRoutes);

    // ------------------- Background Tasks -------------------
    startCleanupJob();

    // ------------------- Error Handling -------------------
    app.use(errorHandler);

    // ------------------- Start Server -------------------
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // ------------------- Load Menu Map in Background -------------------
    loadMenuMap().then(() => console.log("Menu map loaded in memory"));
})();

export default app;
