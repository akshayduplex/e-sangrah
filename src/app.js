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
import ApiRoutes from "./routes/index.js";
import pageRoutes from "./routes/web/index.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        ttl: 60 * 60 // 1 hour
    }),
    cookie: { maxAge: 1000 * 60 * 60, secure: false }
}));
app.use(methodOverride('_method'));
app.use(compression());
app.use(morgan("dev"));
app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views
app.set("view engine", "ejs");
app.set("views", path.resolve("views"));
app.use(express.static(path.resolve("public")));

// Global locals
app.use((req, res, next) => {
    const user = req.session.user || {};
    res.locals.BASE_URL = process.env.BASE_URL;
    res.locals.avatar = user.avatar || null;
    res.locals.role = user.role || null;
    res.locals.email = user.email || null;
    res.locals.name = user.name || null;

    // Make req.user available in controllers
    req.user = user;
    next();
});

// Routes
app.use("/api", ApiRoutes);
app.use("/", pageRoutes);

// Error handling
app.use(errorHandler);

export default app;
