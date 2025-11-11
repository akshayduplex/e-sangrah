const fileIcons = {
    ppt: "/img/icons/fn1.png",
    pptx: "/img/icons/fn1.png",
    doc: "/img/icons/fn2.png",
    docx: "/img/icons/fn2.png",
    xls: "/img/icons/fn3.png",
    xlsx: "/img/icons/fn3.png",
    pdf: "/img/icons/fn4.png",
    default: "/img/icons/fn1.png"
};



// =================== Dashboard Stats ===================
async function loadDashboardStats(filter = 'today') {
    try {
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();

        if (result.success) {
            const stats = result.data;
            document.getElementById('pendingCount').innerText = stats.pending || 0;
            document.getElementById('approvedCount').innerText = stats.approved || 0;
            document.getElementById('rejectedCount').innerText = stats.rejected || 0;
        } else {
            console.error('Failed to load dashboard stats:', result.message);
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
    }
}

// =================== File Status Logs ===================
async function loadFileStatusLogs(filter = 'today') {
    const tableBody = document.getElementById('fileStatusTableBody');
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">Loading...</td></tr>`;

    try {
        const response = await fetch('/api/dashboard/file-status');
        const result = await response.json();

        if (result.success && Array.isArray(result.files)) {
            const rows = result.files.map(file => {
                const user = file.performedBy?.name || "Unknown User";
                const fileName = file.name || "Untitled";
                const fileSize = file.fileSize || "-";
                const icon = getFileIcon(fileName);
                const action = file.status || "—";
                const formattedDate = formatDateTime(file.lastActionTime);

                return `
                    <tr>
                        <td><p>${user}</p></td>
                        <td>
                            <div class="flxtblleft">
                                <span class="avatar rounded bg-light mb-2">
                                    <img src="${icon}" alt="${fileName}">
                                </span>
                                <div class="flxtbltxt">
                                    <p class="fs-14 mb-1 fw-normal text-neutral">${fileName}</p>
                                    <span class="fs-11 fw-light text-black">${fileSize}</span>
                                </div>
                            </div>
                        </td>
                        <td><p class="tbl_date">${formattedDate}</p></td>
                        <td><p>${action}</p></td>
                    </tr>
                `;
            }).join('');

            tableBody.innerHTML = rows || `<tr><td colspan="4" class="text-center py-3 text-muted">No records found.</td></tr>`;
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger">Failed to load logs</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching file status logs:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger">Error loading data</td></tr>`;
    }
}

// =================== Documents ===================
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const result = await response.json();

        if (!result.success || !Array.isArray(result.data?.documents)) {
            console.warn('No documents found.');
            return;
        }

        const tbody = document.querySelector('#documentsTable tbody');
        if (!tbody) {
            console.error('Table body not found.');
            return;
        }

        tbody.innerHTML = ''; // Clear old rows

        result.data.documents.forEach(doc => {
            const { metadata, department, compliance, files } = doc;
            const file = files?.[0];

            const fileName = file?.originalName || metadata?.fileName || 'Untitled';
            const fileSizeKB = file?.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : '—';
            const version = file?.version ? ` <span class="text-success">v${file.version}</span>` : '';

            const fileIcon = getFileIcon(fileName);

            const expiry = compliance?.expiryDate ? formatDateTime(compliance.expiryDate) : 'N/A';
            const retention = compliance?.retentionPeriod || 'Active';
            const isCompliant = compliance?.isCompliance
                ? `<p class="text-success d-flex align-items-center gap-2">
        <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle" style="width: 28px; height: 28px;">
           <i class="ti ti-check"></i>
        </span>
        Compliant
     </p>`
                : `<p class="text-danger d-flex align-items-center gap-2">
        <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle" style="width: 28px; height: 28px;">
            <i class="ti ti-x"></i>
        </span>
        Non-Compliant
     </p>`;

            // --- Action Buttons (with proper data attributes) ---
            const viewUrl = doc.link || `/documents/view/${doc._id}`;
            const editUrl = `/documents/edit/${doc._id}`;

            const actionsDropdown = `
                <div class="btn-group" role="group">
                    <button type="button" class="btn border-0" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ti ti-settings"></i>
                    </button>
                    <!-- 1. DROPDOWN MENU – add the two new items -->
<ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="${doc.link || '#'}"><i class="ti ti-eye"></i> View</a></li>
                    <li><a class="dropdown-item" href="/documents/edit/${doc._id}"><i class="ti ti-pencil-minus"></i> Edit</a></li>
                    <li>
                        <a class="dropdown-item share-btn" href="#" data-doc-id="${doc._id}"  data-file-id="${doc.files?.[0]?._id || ''}"  data-bs-toggle="modal" data-bs-target="#sharedoc-modal">
                            <i class="ti ti-share"></i> Share
                        </a>
                    </li>
                    <li>
<a class="dropdown-item" href="#" data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#versionhistory-modal">
    <i class="ti ti-history"></i> Version History
</a></li>
                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#downloaddoc-modal"><i class="ti ti-download"></i> Download</a></li>
                    <li><a class="dropdown-item btn-delete" href="#" data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#trashdoc-modal"><i class="ti ti-trash"></i> Move to Trash</a></li>
                    <li><a class="dropdown-item archive-document" href="#"  data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#archivedoc-modal"><i class="ti ti-archive"></i> Move to Archive</a></li>
                </ul>
                </div>`;

            // --- Row HTML ---
            const rowHTML = `
                <tr>
                    <td>${actionsDropdown}</td>
                    <td>
                        <div class="flxtblleft">
                            <span class="avatar rounded bg-light mb-2">
                                <img src="${fileIcon}" alt="file icon">
                            </span>
                            <div class="flxtbltxt">
                                <p class="fs-14 mb-1 fw-normal text-neutral">
                                    ${escapeHtml(fileName)}${version}
                                </p>
                                <span class="fs-11 fw-light text-black">${fileSizeKB}</span>
                            </div>
                        </div>
                    </td>
                    <td><p>${department?.name || 'N/A'}</p></td>
                    <td>${isCompliant}</td>
                    <td><p>${escapeHtml(retention)}</p></td>
                    <td><p class="tbl_date">${expiry}</p></td>
                </tr>`;

            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });

    } catch (err) {
        console.error('Error loading documents:', err);
        const tbody = document.querySelector('#documentsTable tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Failed to load documents.</td></tr>`;
        }
    }
}

// --- Helper: Escape HTML to prevent XSS ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return fileIcons[ext] || fileIcons.default;
}

function formatDateTime(iso) {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadFileUsage() {
    try {
        const res = await fetch('/api/analytics/department-file-usage');
        const data = await res.json();

        Highcharts.chart('fileUsageChart', {
            chart: { type: 'line' },
            title: { text: null },
            xAxis: { categories: data.categories },
            yAxis: { title: null },
            series: data.series,
            credits: false
        });
    } catch (error) {
        console.error("Error loading chart:", error);
    }
}


async function loadAnalyticsStats() {
    try {
        const res = await fetch("/api/analytics/stats");
        const { data } = await res.json();

        document.querySelector("#total-documents").textContent = data.totalDocuments;
        document.querySelector("#uploaded-this-month").textContent = data.uploadedThisMonth;
        document.querySelector("#modified-documents").textContent = data.modifiedDocuments;
        document.querySelector("#deleted-archive").textContent = data.deletedOrArchived;
    } catch (err) {
        console.error("Failed to load document stats:", err);
    }
}

// =================== Event Listeners ===================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadFileStatusLogs();
    loadDocuments();
    loadAnalyticsStats();
    loadFileUsage();
    document.getElementById('filterRange')?.addEventListener('change', (e) => {
        loadDashboardStats(e.target.value);
    });
});
document.getElementById('logFilter')?.addEventListener('change', (e) => {
    loadFileStatusLogs(e.target.value);
});