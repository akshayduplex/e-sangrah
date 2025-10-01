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
    DAILY: "daily",
    MONTHLY: "monthly",
    YEARLY: "yearly"
};

export const Document_STATUS = {
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected"
};

export const profile_type = ["user"]