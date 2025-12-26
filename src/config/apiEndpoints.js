// Import dotenv to load environment variables
import dotenv from 'dotenv';
dotenv.config(); // Load variables from .env file

// ----------------------------
// API Endpoints
// ----------------------------
export const API_ENDPOINTS = {
    documents: '/documents',
    users: '/users',
    departments: '/departments',
    projects: '/projects',
    folders: '/folders',
    auth: '/auth',
    notifications: '/notifications',
    reports: '/reports',
    settings: '/settings'
};

const getEnvParam = (param, defaultVal) => {
    const val = process.env[param];
    if (!val) {
        if (process.env.NODE_ENV === 'production') {
            console.warn(`[WARNING] Missing environment variable: ${param}. Using default value.`);
        }
        return defaultVal;
    }
    return val;
};

// ----------------------------
// Centralized API Configuration
// ----------------------------
export const API_CONFIG = {
    // Application URLs
    FrontendUrl: process.env.FrontendUrl,
    baseUrl: process.env.BASE_URL,

    // Security / Secrets
    SESSION_SECRET: getEnvParam('SESSION_SECRET', 'default_session_secret_change_me'),
    JWT_SECRET: getEnvParam('JWT_SECRET', 'default_jwt_secret_change_me'),
    ACCESS_GRANT_SECRET: getEnvParam('ACCESS_GRANT_SECRET', 'default_access_grant_secret_change_me'),
    encryptedKey: process.env.URL_ENCRYPTION_KEY || '12345678901234567890123456789012',

    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,

    // Database
    MONGO_URI: process.env.MONGO_URI,
    DB_NAME: process.env.DB_NAME,

    // AWS Configuration
    AWS_BUCKET: process.env.AWS_BUCKET,
    AWS_REGION: process.env.AWS_DEFAULT_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_ENDPOINT: process.env.AWS_ENDPOINT,
    AWS_URL: process.env.AWS_URL,

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // API Behavior
    TOKEN_LOGIN_EXPIRES_IN: process.env.TOKEN_LOGIN_EXPIRES_IN,
    timeout: Number(process.env.API_TIMEOUT) || 5000,
    retryAttempts: Number(process.env.API_RETRY_ATTEMPTS) || 3,

    //Company Details
    COMPANY_NAME: process.env.COMPANY_NAME,
    LOGO_URL: process.env.LOGO_URL,
    EMAIL_BANNER: process.env.EMAIL_BANNER
};

// Validation for Production
if (API_CONFIG.NODE_ENV === 'production') {
    if (API_CONFIG.SESSION_SECRET === 'default_session_secret_change_me' ||
        API_CONFIG.JWT_SECRET === 'default_jwt_secret_change_me') {
        console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.warn('CRITICAL WARNING: You are using default secrets in PRODUCTION. This is insecure.');
        console.warn('Please set SESSION_SECRET and JWT_SECRET in your .env file immediately.');
        console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    }
}
