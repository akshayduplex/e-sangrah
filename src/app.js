// import "dotenv/config"; // loads .env
// import express from "express";
// import path from "path";
// import morgan from "morgan";
// import helmet from "helmet";
// import compression from "compression";
// import session from "express-session";
// import MongoStore from "connect-mongo";
// import flash from "connect-flash";
// import methodOverride from "method-override";
// import ApiRoutes from "./routes/index.js";
// import pageRoutes from "./routes/web/index.js";
// import errorHandler from "./middlewares/errorHandler.js";
// import { formatDateDDMMYYYY } from "./utils/formatDate.js";

// const app = express();

// // Session
// app.use(session({
//     secret: process.env.SESSION_SECRET || "super-secret-key",
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.MONGO_URI,
//         collectionName: "sessions",
//         ttl: 60 * 60 // 1 hour
//     }),
//     cookie: { maxAge: 1000 * 60 * 60, secure: false }
// }));
// app.use(methodOverride('_method'));
// app.use(compression());
// app.use(morgan("dev"));
// app.use(flash());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Views
// app.set("view engine", "ejs");
// app.set("views", path.resolve("views"));
// app.use(express.static(path.resolve("public")));

// // Global locals
// app.use((req, res, next) => {
//     const user = req.session.user || {};
//     res.locals.BASE_URL = process.env.BASE_URL;
//     res.locals.avatar = user.avatar || null;
//     res.locals.role = user.role || null;
//     res.locals.email = user.email || null;
//     res.locals.name = user.name || null;
//     res.locals.formatDateDDMMYYYY = formatDateDDMMYYYY;
//     // Make req.user available in controllers
//     req.user = user;
//     next();
// });

// // Routes
// app.use("/api", ApiRoutes);
// app.use("/", pageRoutes);

// // Error handling
// app.use(errorHandler);

// export default app;

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
import { formatDateDDMMYYYY } from "./utils/formatDate.js";

const app = express();
// app.use(
//     helmet.contentSecurityPolicy({
//         directives: {
//             defaultSrc: ["'self'"],
//             scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
//             styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
//         },
//     })
// );

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false }));
// app.disable("x-powered-by");

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views
app.set("view engine", "ejs");
app.set("views", path.resolve("views"));
app.use(express.static(path.resolve("public")));

// Global locals (available in templates)
app.use((req, res, next) => {
    const user = req.session.user || {};
    res.locals.BASE_URL = process.env.BASE_URL || "";
    res.locals.avatar = user.avatar || null;
    res.locals.profile_type = user.profile_type || null;
    res.locals.email = user.email || null;
    res.locals.name = user.name || null;
    res.locals.formatDateDDMMYYYY = formatDateDDMMYYYY;

    req.user = user; // convenience for controllers
    next();
});

// Routes
app.use("/api", ApiRoutes);
app.use("/", pageRoutes);

// Error handling
app.use(errorHandler);

export default app;
