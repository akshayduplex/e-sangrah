// const { createLogger, format, transports } = require("winston");

// const logger = createLogger({
//     level: process.env.LOG_LEVEL || "info",
//     format: format.combine(
//         format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
//         format.errors({ stack: true }),
//         format.splat(),
//         format.json()
//     ),
//     defaultMeta: { service: "my-app" },
//     transports: [
//         new transports.Console({
//             format: format.combine(
//                 format.colorize(),
//                 format.printf(
//                     (info) => `[${info.timestamp}] ${info.level}: ${info.message} ${info.stack || ""}`
//                 )
//             )
//         }),
//         new transports.File({ filename: "logs/error.log", level: "error" }),
//         new transports.File({ filename: "logs/combined.log" })
//     ],
// });

// module.exports = logger;
