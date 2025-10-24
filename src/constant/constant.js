// Constants for state management and configuration
export const RECENT_DOCS_DEFAULT_STATE = {
    page: 1,
    limit: 10,
    departmentId: '',
    sortBy: ''
};

export const STATUS_CLASSES = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected"
};

export const STATUS_LABELS = {
    Pending: "Pending",
    Approved: "Approved",
    Rejected: "Rejected"
};

export const COMPLIANCE_OPTIONS = {
    YES: "yes",
    NO: "no"
};

export const FILTER_PERIODS = {
    DAILY: "today",
    WEEKLY: "week",
    MONTHLY: "month",
    YEARLY: "year"
};


export const Document_STATUS = {
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected"
};

export const profile_type = ["user", "vendor", "donor"];

// Centralized array of document types
export const docTypes = [
    { value: "application/vnd.ms-excel", label: "Excel (.xls)" },
    { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel (.xlsx)" },
    { value: "application/vnd.ms-excel.sheet.macroenabled.12", label: "Excel Macro (.xlsm)" },
    { value: "application/vnd.ms-excel.sheet.binary.macroenabled.12", label: "Excel Binary Macro (.xlsb)" },
    { value: "application/vnd.ms-excel.template.macroenabled.12", label: "Excel Macro Template (.xltm)" },
    { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.template", label: "Excel Template (.xltx)" },
    { value: "application/vnd.oasis.opendocument.spreadsheet", label: "OpenDocument (.ods)" },
    { value: "application/x-excel", label: "Legacy Excel (.xls)" },
    { value: "application/x-msexcel", label: "Legacy Excel alternative (.xls)" }
];