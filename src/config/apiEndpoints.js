// Centralized API endpoint configuration
export const API_ENDPOINTS = {
    DOCUMENTS: window.env?.API_BASE_URL || '/api/documents',
    DASHBOARD: window.env?.DASHBOARD_API_URL || '/api/dashboard',
    DEPARTMENT_STATS: window.env?.DEPARTMENT_STATS_API_URL || '/api/dashboard/department-document-uploads',
    UPLOAD_TRENDS: window.env?.UPLOADS_TRENDS_API_URL || '/api/dashboard/department-documents',
    PROJECTS: '/api/projects'
};

export default API_ENDPOINTS;