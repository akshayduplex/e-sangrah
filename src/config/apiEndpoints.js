import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

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

// Centralized API config
export const API_CONFIG = {
    baseUrl: process.env.BASE_URL || 'http://localhost:5000/api',
    MONGO_URI: process.env.MONGO_URI,
    DB_NAME: process.env.DB_NAME,
    Bucket: process.env.AWS_BUCKET,
    ACCESS_GRANT_SECRET: process.env.ACCESS_GRANT_SECRET,
    encryptedKey: process.env.URL_ENCRYPTION_KEY || '12345678901234567890123456789012',
    timeout: Number(process.env.API_TIMEOUT) || 5000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    retryAttempts: Number(process.env.API_RETRY_ATTEMPTS) || 3
};


// import { API_ENDPOINTS, API_CONFIG } from './config';

// async function fetchDocuments() {
//     const response = await fetch(`${API_CONFIG.baseUrl}${API_ENDPOINTS.documents}`, {
//         method: 'GET',
//         headers: API_CONFIG.headers,
//         timeout: API_CONFIG.timeout
//     });
//     return response.json();
// }
