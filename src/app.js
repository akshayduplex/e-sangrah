import "dotenv/config"; // loads .env
import express from "express";
import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import methodOverride from "method-override";
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import ApiRoutes from "./routes/index.js";
import pageRoutes from "./routes/web/index.js";
import errorHandler from "./middlewares/errorHandler.js";
import { formatDateDDMMYYYY } from "./utils/formatDate.js";
import { startCleanupJob } from "./helper/node-cron.js";

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false }));

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "super-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
            ttl: 60 * 60, // 1 hour
        }),
        cookie: {
            maxAge: 1000 * 60 * 60, // 1 hour
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // HTTPS only in production
            sameSite: "lax",
        },
    })
);


app.use(methodOverride("_method"));
app.use(compression());
app.use(morgan("dev"));
app.use(flash());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views
app.set("view engine", "ejs");
app.set("views", path.resolve("views"));
app.use(express.static(path.resolve("public")));

// Global locals
app.use((req, res, next) => {
    const user = req.user || req.session.user || {};
    res.locals.BASE_URL = process.env.BASE_URL || "";
    res.locals.profile_image = user.profile_image || null;
    res.locals.profile_type = user.profile_type || null;
    res.locals.email = user.email || null;
    res.locals.name = user.name || null;
    res.locals.formatDateDDMMYYYY = formatDateDDMMYYYY;

    next();
});

// Routes
app.use("/api", ApiRoutes);
app.use("/", pageRoutes);

// Start cleanup cron job
startCleanupJob();
// Error handling
app.use(errorHandler);

// Make sure to export the app
export default app;