import express from "express";
import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
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
import { startCleanupJob } from "./helper/NodeCron.js";
import { connectDB } from "./database/Db.js";
import { loadMenuMap } from './middlewares/checkPermission.js';
import fs from "fs";
import { API_CONFIG } from "./config/ApiEndpoints.js";

const app = express();

// ------------------- Async Startup -------------------
(async () => {
    // Connect to MongoDB
    console.time("MongoDB Connect");
    await connectDB();
    console.timeEnd("MongoDB Connect");
    app.use(cors({
        origin: [API_CONFIG.baseUrl, 'http://localhost:5000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    }));
    // Security middleware
    app.use(helmet({ contentSecurityPolicy: false }));

    // Logging
    const logDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });

    if (API_CONFIG.NODE_ENV === "development") {
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
            secret: API_CONFIG.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            rolling: true,
            store: MongoStore.create({
                mongoUrl: API_CONFIG.MONGO_URI,
                collectionName: "sessions",
                ttl: 60 * 60,          // 1 hour
                touchAfter: 24 * 3600, // avoid rewriting unchanged sessions
            }),
            cookie: {
                maxAge: 1000 * 60 * 60,
                httpOnly: true,
                // secure: process.env.NODE_ENV === "production",
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
        res.locals.BASE_URL = API_CONFIG.baseUrl || "";
        res.locals.designation = user.designation || null;
        res.locals.department = user.department || null;
        res.locals.profile_image = user.profile_image || null;
        res.locals.profile_type = user.profile_type || null;
        res.locals.email = user.email || null;
        res.locals.name = user.name || null;
        res.locals.todayDate = formatDateDDMMYYYY();
        next();
    });

    // ------------------- Routes -------------------
    app.use("/api", ApiRoutes);
    app.use("/", pageRoutes);
    app.get('/', async (req, res) => {
        res.redirect('/login');
    });

    // ------------------- Background Tasks -------------------
    startCleanupJob();

    // ------------------- Error Handling -------------------
    app.use(errorHandler);

    // ------------------- Load Menu Map in Background -------------------
    loadMenuMap();
})();

export default app;
