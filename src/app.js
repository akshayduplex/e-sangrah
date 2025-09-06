require("dotenv").config(); // make sure .env is loaded

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require('connect-flash');
const ApiRoutes = require("./routes/index");
const pageRoutes = require("./routes/web");
const errorHandler = require("./middlewares/errorHandler");
const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        ttl: 60 * 60 // 1 hour in seconds
    }),
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour in ms
        secure: false // true if HTTPS
    }
}));

app.use(compression());

// Logging
app.use(morgan("dev"));

app.use(flash());
// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

//Set global local variable for EJS
app.use((req, res, next) => {
    res.locals.BASE_URL = process.env.BASE_URL;
    const user = req.session.user || {};
    res.locals.avatar = user.avatar || null;
    res.locals.role = user.role || null;
    res.locals.email = user.email || null;
    res.locals.name = user.name || null;
    next();
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal Server Error'
    });
});

// Routes
app.use("/api", ApiRoutes);
app.use("/", pageRoutes);

// Error Handler
app.use(errorHandler);

module.exports = app;
