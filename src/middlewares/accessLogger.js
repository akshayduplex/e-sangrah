import geoip from "geoip-lite";
import logger from "../utils/logger.js";

const accessLogger = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip); // Returns country, region, city, lat/lon
    const userAgent = req.headers['user-agent'];
    const method = req.method;
    const url = req.originalUrl;
    const timestamp = new Date().toISOString();

    res.on("finish", () => {
        const status = res.statusCode;

        logger.info(`SECURITY LOG:
            IP: ${ip}
            Location: ${geo ? `${geo.city}, ${geo.region}, ${geo.country}` : "Unknown"}
            Coordinates: ${geo ? `${geo.ll[0]}, ${geo.ll[1]}` : "Unknown"}
            Method: ${method}
            URL: ${url}
            Status: ${status}
            User-Agent: ${userAgent}
            Time: ${timestamp}
        `);
    });

    next();
};

export default accessLogger;
