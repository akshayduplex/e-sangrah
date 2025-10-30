$(document).ready(function () {
    const baseUrl = window.baseUrl;
    let currentProjectId = '';
    let currentPeriod = 'today';

    // ==============================
    // Load current project from session
    // ==============================
    async function loadCurrentProject() {
        try {
            const response = await fetch(`${baseUrl}/api/session/project`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.selectedProject) {
                currentProjectId = data.selectedProject;
                console.log("Loaded project from session:", currentProjectId);

                // Update the header display
                $('#currentProjectName').text(data.selectedProjectName || 'No project selected');

                // Set the project in the upload department dropdown if needed
                if ($('#uploadDepartment').length && currentProjectId) {
                    $('#uploadDepartment').val(currentProjectId).trigger('change');
                }

                // Load charts with the current project
                loadDepartmentUploads(currentProjectId, currentPeriod);
            }
        } catch (error) {
            console.error('Error loading current project:', error);
        }
    }

    // ==============================
    // Initialize Header Project Select
    // ==============================
    function initializeHeaderProjectSelect() {
        const $headerProjectSelect = $('#selectHeaderProject');
        if (!$headerProjectSelect.length) return;

        $headerProjectSelect.select2({
            placeholder: 'Select project',
            allowClear: true,
            width: '200px',
            ajax: {
                url: `${baseUrl}/api/projects`,
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 10
                    };
                },
                processResults: function (data) {
                    return {
                        results: (data.data || []).map(p => ({
                            id: p._id,
                            text: p.projectName || p.name
                        }))
                    };
                },
                cache: true
            }
        });

        $headerProjectSelect.on('select2:select select2:unselect', async function () {
            const projectId = $(this).val();
            const projectName = $(this).find('option:selected').text();

            try {
                const res = await fetch(`${baseUrl}/api/session/project`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        projectId: projectId || null,
                        projectName: projectName || ''
                    })
                });

                if (!res.ok) throw new Error('Failed to save project selection');

                // Update current project and reload charts
                currentProjectId = projectId || '';

                if (projectId) {
                    $('#currentProjectName').text(projectName);
                    console.log("Project selected:", projectId);

                    // Reload all charts with new project
                    loadDepartmentUploads(projectId, currentPeriod);
                    loadDashboardStats(projectId);
                } else {
                    $('#currentProjectName').text('No project selected');
                    // Reload with no project filter
                    loadDepartmentUploads('', currentPeriod);
                    loadDashboardStats('');
                }

            } catch (err) {
                console.error('Error saving project selection:', err);
            }
        });
    }

    // ==============================
    // Initialize Select2 for Recent Activity Department
    // ==============================
    function initializeRecentActivityDepartment() {
        $("#recentActivityDepartment").select2({
            placeholder: "-- Select Department --",
            allowClear: true,
            width: '100%',
            ajax: {
                url: '/api/departments/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 50
                    };
                },
                processResults: function (data) {
                    let results = data.data.map(dep => ({ id: dep._id, text: dep.name }));
                    results.unshift({ id: '', text: '-- Select Department --' });
                    return { results: results };
                },
                cache: true
            }
        });

        $("#recentActivityDepartment").on('change', function () {
            console.log("Selected Recent Activity Department ID:", $(this).val());
        });
    }

    // ==============================
    // File Status Loader
    // ==============================
    async function loadFileStatus(projectId = '') {
        try {
            const url = projectId
                ? `/api/dashboard/file-status?projectId=${projectId}`
                : '/api/dashboard/file-status';

            const response = await fetch(url);
            const data = await response.json();

            if (!data.success) {
                console.error('Failed to load file data');
                return;
            }

            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';

            data.files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.classList.add('dflexbtwn', 'mb-2');

                fileItem.innerHTML = `
                    <div class="flxtblleft">
                        <span class="avatar rounded bg-light mb-2">
                            <img src="${file.icon}" alt="icon" data-id="${file._id}" class="file-icon">
                        </span>
                        <div class="flxtbltxt">
                            <p class="fs-14 mb-1 fw-normal">${file.name}</p>
                            <span class="fs-11 fw-light text-black">${file.fileSize}</span>
                        </div>
                    </div>
                    <div class="flxtblright">
                        <p class="fs-12 fw-light text-black">${file.status}</p>
                    </div>
                `;

                fileList.appendChild(fileItem);
            });

            document.querySelectorAll('.file-icon').forEach(img => {
                img.addEventListener('dblclick', (e) => {
                    const fileId = e.target.getAttribute('data-id');
                    if (fileId) {
                        const url = `/folders/view/${fileId}`;
                        window.open(url, '_blank');
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching file data:', error);
        }
    }

    // ==============================
    // Load Recent Activities
    // ==============================
    async function loadRecentActivities(projectId = '') {
        try {
            const url = projectId
                ? `${baseUrl}/api/dashboard/recent-activity?projectId=${projectId}`
                : `${baseUrl}/api/dashboard/recent-activity`;

            const response = await fetch(url);
            const result = await response.json();

            if (!result.recentActivities || !Array.isArray(result.recentActivities)) {
                console.error('No recent activities found');
                return;
            }

            const container = $('#recentActivityContainer');
            container.empty();

            result.recentActivities.forEach(activity => {
                const user = activity.userName || 'Unknown User';
                const docName = activity.documentName || 'Unnamed Document';
                const action = activity.activity || 'updated';
                const version = activity.version?.$numberDecimal ? `(v${activity.version.$numberDecimal})` : '';

                const cardItem = `
                    <div class="dflexbtwn mb-2" style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="flxtblleft gap-0" style="display: flex; align-items: center;">
                            <img src="/img/icons/usrround.png" alt="User" style="width: 32px; height: 32px;">
                            <div class="flxtbltxt ms-3">
                                <p class="fs-16 mb-1 fw-normal">
                                    ${user} has ${action.toLowerCase()} the document ${docName} ${version}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                container.append(cardItem);
            });

        } catch (err) {
            console.error('Error loading recent activities:', err);
        }
    }

    // ==============================
    // Initialize Upload Department
    // ==============================
    function initializeUploadDepartment() {
        $("#uploadDepartment").select2({
            placeholder: "-- All Departments --",
            allowClear: true,
            width: '100%',
            ajax: {
                url: '/api/departments/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 50
                    };
                },
                processResults: function (data) {
                    let results = data.data.map(dep => ({ id: dep._id, text: dep.name }));
                    results.unshift({ id: '', text: '-- Select Department --' });
                    return { results: results };
                },
                cache: true
            }
        });

        $("#uploadDepartment").on('change', function () {
            const departmentId = $(this).val();
            console.log("Selected Upload Department ID:", departmentId);
            // Reload charts with department filter if needed
            loadDepartmentUploads(currentProjectId, currentPeriod, departmentId);
        });
    }

    // ==============================
    // Dashboard Stats with Project Filter
    // ==============================
    function loadDashboardStats(projectId = '') {
        const url = projectId
            ? `${baseUrl}/api/dashboard/stats?projectId=${projectId}`
            : `${baseUrl}/api/dashboard/stats`;

        $.ajax({
            url: url,
            type: "GET",
            success: function (response) {
                if (response.success) {
                    $('#totalDocs').text(response.data.total);
                    $('#approvedDocs').text(response.data.approved);
                    $('#pendingDocs').text(response.data.pending);
                    $('#rejectedDocs').text(response.data.rejected);
                    $('#pendingCount').text(response.data.pending);
                } else {
                    console.error('Failed to fetch dashboard stats');
                }
            },
            error: function () {
                console.error("Failed to fetch dashboard stats");
            }
        });
    }

    // ==============================
    // Load Documents with Project Filter
    // ==============================
    async function loadDocuments(projectId = '') {
        try {
            const response = await fetch(`${baseUrl}/api/documents`);
            const result = await response.json();

            if (!result.success) {
                console.error('Failed to fetch documents');
                return;
            }

            const documents = result.data.documents;
            const tableBody = $('table tbody');
            tableBody.empty(); // Clear any existing rows

            documents.forEach(doc => {
                const fileSize = doc.files && doc.files.length
                    ? (doc.files[0].fileSize / 1024).toFixed(2) + ' KB'
                    : '0 KB';
                const createdDate = new Date(doc.createdAt).toLocaleString();
                const updatedDate = new Date(doc.updatedAt).toLocaleString();
                const tags = doc.tags.join(', ') || '-';
                const sharedWith = doc.sharedWithUsers.map(u => u.name).join(', ') || '-';

                let statusClass = '';
                switch (doc.status) {
                    case 'Draft': statusClass = 'bg-soft-info'; break;
                    case 'Pending': statusClass = 'bg-soft-warning'; break;
                    case 'Approved': statusClass = 'bg-soft-success'; break;
                    case 'Rejected': statusClass = 'bg-soft-danger'; break;
                    default: statusClass = 'bg-soft-secondary';
                }

                const row = `
                    <tr>
                        <td>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn border-0" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="ti ti-settings"></i>
                                </button>
                                <ul class="dropdown-menu">
                                     <li><a class="dropdown-item" href="${doc.link || '#'}"><i class="ti ti-eye"></i> View</a></li>
                    <li><a class="dropdown-item" href="/documents/edit/${doc._id}"><i class="ti ti-pencil-minus"></i> Edit</a></li>
                    <li>
                        <a class="dropdown-item share-btn" href="#" data-doc-id="${doc._id}"  data-file-id="${doc.files?.[0]?._id || ''}"  data-bs-toggle="modal" data-bs-target="#sharedoc-modal">
                            <i class="ti ti-share"></i> Share
                        </a>
                    </li>
                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#versionhistory-modal"><i class="ti ti-history"></i> Version History</a></li>
                    <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#downloaddoc-modal"><i class="ti ti-download"></i> Download</a></li>
                    <li><a class="dropdown-item btn-delete" href="#" data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#trashdoc-modal"><i class="ti ti-trash"></i> Move to Trash</a></li>
                    <li><a class="dropdown-item archive-document" href="#"  data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#archivedoc-modal"><i class="ti ti-archive"></i> Move to Archive</a></li>
                                </ul>
                            </div>
                        </td>
                        <td>
                            <div class="flxtblleft">
                                <span class="avatar rounded bg-light mb-2">
                                    <img src="${doc.files.length ? '/img/icons/fn1.png' : '/img/icons/fn2.png'}" alt="File Icon">
                                </span>
                                <div class="flxtbltxt">
                                    <p class="fs-14 mb-1 fw-normal">${doc.metadata.fileName}${doc.files.length > 1 ? ` +${doc.files.length - 1}` : ''}</p>
                                    <span class="fs-11 fw-light text-black">${fileSize}</span>
                                </div>
                            </div>
                        </td>
                        <td><p class="tbl_date">${updatedDate}</p></td>
                        <td><p>${doc.owner.name}</p></td>
                        <td><p>${doc.department.name}</p></td>
                        <td><p>${doc.project.projectName}</p></td>
                        <td><p>${sharedWith}</p></td>
                        <td><p>${tags}</p></td>
                        <td><p>${doc.metadata.mainHeading || '-'}</p></td>
                        <td><p class="tbl_date">${createdDate}</p></td>
                        <td><p>${doc.description.replace(/(<([^>]+)>)/gi, '') || '-'}</p></td>
                        <td><p>${doc.comment || '-'}</p></td>
                        <td><span class="badge badge-md ${statusClass}">${doc.status}</span></td>
                    </tr>
                `;
                tableBody.append(row);
            });
        } catch (err) {
            console.error('Error loading documents:', err);
        }
    }

    // ==============================
    // Department Uploads Chart (UPDATED)
    // ==============================
    function loadDepartmentUploads(projectId = '', period = 'today', departmentId = '') {
        if (!$('#department').length) return;

        // Destroy existing chart if it exists
        const chartCanvas = document.getElementById('department');
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (projectId) params.append('projectId', projectId);
        if (period) params.append('period', period);
        if (departmentId) params.append('departmentId', departmentId);

        const url = `${baseUrl}/api/dashboard/uploads?${params.toString()}`;

        $.ajax({
            url: url,
            method: "GET",
            dataType: "json",
            success: function (result) {
                if (result.success && result.data && result.data.departmentUploads) {
                    const departments = result.data.departmentUploads;
                    const labels = departments.map(dep => dep.departmentName);
                    const dataValues = departments.map(dep => dep.percentage);

                    const backgroundColors = [
                        '#10A37F', '#33A3D2', '#F15C44', '#2B1871',
                        '#8A38F5', '#8A4167', '#E8B730', '#24A19C'
                    ];

                    const ctx = chartCanvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Department Uploads (%)',
                                data: dataValues,
                                backgroundColor: backgroundColors.slice(0, labels.length),
                                borderWidth: 5,
                                borderRadius: 10,
                                borderColor: '#fff',
                                hoverBorderWidth: 0,
                                cutout: '63%',
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            const department = departments[context.dataIndex];
                                            return ` ${department.documentCount} documents`;
                                        }
                                    }
                                }
                            }
                        }
                    });

                    // Update center text if needed
                    updateChartCenterText(departments);
                } else {
                    console.warn("Unexpected API response", result);
                    // Create empty chart
                    createEmptyChart();
                }
            },
            error: function (xhr, status, error) {
                console.error("Error loading department uploads:", error);
                createEmptyChart();
            }
        });
    }

    function updateChartCenterText(departments) {
        const centerElement = document.querySelector('.attendance-canvas');
        if (centerElement && departments.length > 0) {
            const topDepartment = departments[0];
            centerElement.innerHTML = `
                <p class="fs-13 mb-1">${topDepartment.departmentName}</p>
                <h3>${topDepartment.percentage}%</h3>
            `;
        }
    }

    function createEmptyChart() {
        const ctx = document.getElementById('department').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [100],
                    backgroundColor: ['#e9ecef'],
                    borderWidth: 5,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // ==============================
    // Handle period dropdown selection
    // ==============================
    $(document).on('click', '.period-option', function () {
        const selectedPeriod = $(this).data('period');
        const selectedLabel = $(this).text();

        // Update current period
        currentPeriod = selectedPeriod;

        // Update label in dropdown button
        $('#currentPeriodLabel').text(selectedLabel);

        console.log('Selected Period:', selectedPeriod);
        console.log('Current Project ID:', currentProjectId);

        // Reload chart with current project and new period
        loadDepartmentUploads(currentProjectId, selectedPeriod);
    });

    // ==============================
    // Initialize and load everything
    // ==============================
    async function initializeDashboard() {
        // Initialize all select2 components
        initializeHeaderProjectSelect();
        initializeRecentActivityDepartment();
        initializeUploadDepartment();

        // Load current project from session
        await loadCurrentProject();

        // Load initial data
        loadDashboardStats(currentProjectId);
        loadRecentActivities(currentProjectId);
        loadFileStatus(currentProjectId);
        loadDocuments(currentProjectId);

        // Load initial chart
        loadDepartmentUploads(currentProjectId, currentPeriod);
    }

    // Start the dashboard
    initializeDashboard();
});