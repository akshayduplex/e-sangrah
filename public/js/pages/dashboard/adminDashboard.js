$(document).ready(function () {
    const baseUrl = window.baseUrl;
    let currentProjectId = '';
    let currentPeriod = 'today';
    let typeUploadsperiod = 'today';
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


    function initializeDonorSelect2() {
        $('#dashboardDonor').select2({
            placeholder: '-- Select Donor Name --',
            allowClear: true,
            ajax: {
                url: '/api/user/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    const projectId = $('#projectName').val();
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 10,
                        projectId: projectId,
                        profile_type: 'donor'
                    };
                },
                processResults: function (data, params) {
                    params.page = params.page || 1;
                    const results = data.users.map(u => ({ id: u._id, text: u.name }));
                    return {
                        results,
                        pagination: { more: params.page * 10 < data.pagination.total }
                    };
                },
                cache: true
            },
            minimumInputLength: 0
        });
    }

    function initializeVendorSelect2() {
        $('#dashboardVendor').select2({
            placeholder: '-- Select Vendor Name --',
            allowClear: true,
            ajax: {
                url: '/api/user/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    const projectId = $('#projectName').val();
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 10,
                        projectId: projectId,
                        profile_type: 'vendor'
                    };
                },
                processResults: function (data, params) {
                    params.page = params.page || 1;
                    const results = data.users.map(u => ({ id: u._id, text: u.name }));
                    return {
                        results,
                        pagination: { more: params.page * 10 < data.pagination.total }
                    };
                },
                cache: true
            },
            minimumInputLength: 0
        });
    }
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

                // Update the header display
                $('#currentProjectName').text(data.selectedProjectName || 'No project selected');

                if ($('#uploadDepartment').length && currentProjectId) {
                    $('#uploadDepartment').val(currentProjectId).trigger('change');
                }


                loadDepartmentUploads(currentProjectId, currentPeriod);
                loadDepartmentDocumentsUploads(currentProjectId, typeUploadsperiod);
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

                    // Reload all charts with new project
                    loadDepartmentUploads(projectId, currentPeriod);
                    loadDocumentTypeUploads(projectId, typeUploadsperiod);
                    loadDashboardStats(projectId);
                } else {
                    $('#currentProjectName').text('No project selected');
                    // Reload with no project filter
                    loadDepartmentUploads('', currentPeriod);
                    loadDocumentTypeUploads('', typeUploadsperiod);
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
    // Handle Department or Sort Change for Recent Activity Table
    // ==============================

    $('#recentActivityDepartment, #recentActivitySort').on('change', function () {
        const selectedDepartment = $('#recentActivityDepartment').val() || ''; // empty when cleared
        const selectedSort = $('#recentActivitySort').val() || 'updatedAt';   // default sort

        // Always reload — if no department is selected, load all
        loadDocumentsFiltered(currentProjectId, selectedDepartment, selectedSort);
    });


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
                const formattedDate = formatDateTime(file.lastActionTime);

                const fileItem = document.createElement('div');
                fileItem.classList.add('dflexbtwn', 'flxtblrow', 'align-items-center', 'py-2');

                fileItem.innerHTML = `
                <div class="tbl-col file-name">
                    <span class="avatar rounded bg-light me-2">
                        <img src="${file.icon}" alt="icon" data-id="${file._id}" class="file-icon" style="width:24px; height:24px;">
                    </span>
                    <div class="flxtbltxt">
                            <p class="fs-14 mb-1 fw-normal">${file.name}</p>
                            <span class="fs-11 fw-light text-black">${file.fileSize}</span>
                        </div>
                </div>
                <div class="tbl-col user-name fs-14 fw-light text-black">
                    ${file.performedBy?.name || 'N/A'}
                </div>
                <div class="tbl-col time fs-14 fw-light text-black">
                    ${formattedDate || '—'}
                </div>
                <div class="tbl-col file-status fs-14 fw-light text-black">
                    ${file.status}
                </div>
            `;

                fileList.appendChild(fileItem);
            });

            // Double-click to open file
            document.querySelectorAll('.file-icon').forEach(img => {
                img.addEventListener('dblclick', (e) => {
                    const fileId = e.target.getAttribute('data-id');
                    if (fileId) {
                        window.open(`/folders/view/${fileId}`, '_blank');
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

            const container = $('#recentActivityContainer');
            container.empty();

            if (!result.recentActivities || !Array.isArray(result.recentActivities) || result.recentActivities.length === 0) {
                container.append(`
                <div class="text-center text-muted mt-3">
                    <p>No recent activity found</p>
                </div>
            `);
                return;
            }

            result.recentActivities.forEach(activity => {
                const user = activity.userName || 'Unknown User';
                const action = activity.activity || 'performed an action';

                let itemType = '';
                let itemName = '';
                let icon = '/img/icons/usrround.png';
                let version = activity.version?.$numberDecimal ? `(v${activity.version.$numberDecimal})` : '';

                if (activity.type === 'document') {
                    itemType = 'document';
                    itemName = activity.documentName || 'Unnamed Document';
                } else if (activity.type === 'file') {
                    itemType = 'file';
                    itemName = activity.fileName || 'Unnamed File';
                }

                const formattedDateTime = formatDateTime(activity.timestamp);

                const cardItem = `
        <div class="dflexbtwn mb-2 align-items-start" style="display: flex; justify-content: space-between;">
            <div class="flxtblleft d-flex align-items-start">
                <span class="mb-2">
                    <img src="${icon}" alt="${itemType}">
                </span>
                <div class="flxtbltxt ms-3">
                    <p class="fs-16 mb-1 fw-normal">
                        ${user} ${action.toLowerCase()} the ${itemType} ${itemName} ${version}
                    </p>
                </div>
            </div>
            <div class="text-end text-muted fs-13" style="white-space: nowrap;">
                ${formattedDateTime}
            </div>
        </div>
    `;

                container.append(cardItem);
            })

        } catch (err) {
            console.error('Error loading recent activities:', err);
            $('#recentActivityContainer').html(`
            <div class="text-center text-danger mt-3">
                <p>Failed to load recent activity</p>
            </div>
        `);
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
    // Load Documents with Department Filter + Sort + Top 10 Limit

    // ==============================
    async function loadDocumentsFiltered(projectId = '', departmentId = '', sortBy = 'updatedAt') {
        try {
            const response = await fetch(`${baseUrl}/api/documents${projectId ? `?projectId=${projectId}` : ''}`);
            const result = await response.json();

            if (!result.success || !result.data || !Array.isArray(result.data.documents)) {
                console.warn('No documents found or invalid response');
                $('table tbody').html('<tr><td colspan="13" class="text-center text-muted">No documents found</td></tr>');
                return;
            }

            let documents = result.data.documents;

            // Filter by department only if departmentId is provided
            if (departmentId) {
                documents = documents.filter(doc => doc.department?._id === departmentId);
            }

            // Sort by selected option
            documents.sort((a, b) => {
                switch (sortBy) {
                    case 'createdAt': return new Date(b.createdAt) - new Date(a.createdAt);
                    case 'updatedAt': return new Date(b.updatedAt) - new Date(a.updatedAt);
                    case 'metadata.fileName': return (a.metadata?.fileName || '').localeCompare(b.metadata?.fileName || '');
                    case 'status': return (a.status || '').localeCompare(b.status || '');
                    default: return 0;
                }
            });

            // Limit to Top 10
            documents = documents.slice(0, 10);

            const tableBody = $('table tbody');
            tableBody.empty();

            if (documents.length === 0) {
                tableBody.append('<tr><td colspan="13" class="text-center text-muted">No matching documents found</td></tr>');
                return;
            }

            documents.forEach(doc => {
                const fileSizeKB = doc.files?.[0]
                    ? (doc.files[0].fileSize / 1024).toFixed(2) + ' KB'
                    : '0 KB';
                const createdDate = new Date(doc.createdAt).toLocaleString();
                const updatedDate = new Date(doc.updatedAt).toLocaleString();
                const tags = doc.tags.join(', ') || '-';
                const sharedWith = doc.sharedWithUsers?.length
                    ? (() => {
                        const users = doc.sharedWithUsers.slice(0, 3);
                        const remaining = doc.sharedWithUsers.length - users.length;

                        const avatars = users.map(u => {
                            const imgSrc = u.profile_image || '/img/users/user-01.jpg';
                            return `<img src="${imgSrc}" class="avatar" data-name="${u.name}" title="${u.name}" />`;
                        }).join('');

                        const more = remaining > 0
                            ? `<div class="avatar avatar-more">+${remaining}</div>`
                            : '';

                        return `<div class="avatar-group">${avatars}${more}</div>`;
                    })()
                    : '-';
                const statusKey = doc.status?.toLowerCase() || 'draft';
                const statusClassName = statusClass[statusKey] || 'bg-soft-secondary';
                const description = doc.description
                    ? (() => {
                        const text = doc.description.replace(/<\/?[^>]+(>|$)/g, '');
                        return text.length > 100 ? text.substring(0, 30) + '....' : text;
                    })()
                    : '-';
                const firstFile = doc.files?.[0];
                const fileIcon = firstFile
                    ? fileIcons[firstFile.originalName.split('.').pop().toLowerCase()] || fileIcons.default
                    : fileIcons.default;

                const fileInfoHtml = `
                <div class="flxtblleft d-flex align-items-center">
                    <span class="avatar rounded bg-light me-2 mb-2">
                        <img src="${fileIcon}" style="height:30px;" alt="File Icon">
                    </span>
                    <div class="flxtbltxt">
                        <p class="fs-14 mb-1 fw-normal">${firstFile?.originalName || doc.metadata?.fileName || '-'}
                        ${doc.files?.length > 1 ? ` +${doc.files.length - 1}` : ''}</p>
                        <span class="fs-11 fw-light text-black">${fileSizeKB}</span>
                    </div>
                </div>
            `;

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
                                <li><a class="dropdown-item share-btn" href="#" data-doc-id="${doc._id}" data-file-id="${firstFile?._id || ''}" data-bs-toggle="modal" data-bs-target="#sharedoc-modal"><i class="ti ti-share"></i> Share</a></li>
                                <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#versionhistory-modal"><i class="ti ti-history"></i> Version History</a></li>
                                <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#downloaddoc-modal"><i class="ti ti-download"></i> Download</a></li>
                                <li><a class="dropdown-item btn-delete" href="#" data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#trashdoc-modal"><i class="ti ti-trash"></i> Move to Trash</a></li>
                                <li><a class="dropdown-item archive-document" href="#" data-id="${doc._id}" data-bs-toggle="modal" data-bs-target="#archivedoc-modal"><i class="ti ti-archive"></i> Move to Archive</a></li>
                            </ul>
                        </div>
                    </td>
                    <td>${fileInfoHtml}</td>
                    <td><p class="tbl_date">${updatedDate}</p></td>
                    <td><p>${doc.owner?.name || '-'}</p></td>
                    <td><p>${doc.department?.name || '-'}</p></td>
                    <td><p>${doc.project?.projectName || '-'}</p></td>
                    <td><p>${sharedWith}</p></td>
                    <td><p>${tags}</p></td>
                    <td><p>${doc.metadata?.mainHeading || '-'}</p></td>
                    <td><p class="tbl_date">${createdDate}</p></td>
                    <td><p>${description}</p></td>
                    <td><p>${doc.comment || '-'}</p></td>
                    <td><span class="badge badge-md ${statusClassName}">${doc.status || '-'}</span></td>
                </tr>
            `;
                tableBody.append(row);
            });
        } catch (err) {
            console.error('Error loading filtered documents:', err);
            $('table tbody').html('<tr><td colspan="13" class="text-center text-danger">Error loading documents</td></tr>');
        }
    }

    // ==============================
    // Department Uploads Chart
    // ==============================
    function loadDepartmentUploads(projectId = '', period = 'today', departmentId = '') {
        if (!$('#department').length) return;

        const chartCanvas = document.getElementById('department');
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) existingChart.destroy();

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
                if (result.success && result.data && result.data.departmentUploads?.length) {
                    const departments = result.data.departmentUploads;
                    const labels = departments.map(dep => dep.departmentName);
                    const dataValues = departments.map(dep => dep.percentage);

                    const ctx = chartCanvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Department Uploads (%)',
                                data: dataValues,
                                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'].slice(0, labels.length),
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
                                    usePointStyle: true,
                                    callbacks: {
                                        title: function (context) {
                                            const department = departments[context[0].dataIndex];
                                            return department.departmentName;
                                        },
                                        label: function (context) {
                                            const department = departments[context.dataIndex];
                                            return [
                                                `Documents: ${department.documentCount}`,
                                                `Percentage: ${department.percentage}%`
                                            ];
                                        },
                                        labelPointStyle: function (context) {
                                            return {
                                                pointStyle: 'rectRounded',
                                                rotation: 0,
                                                backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'][context.dataIndex]
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    });

                    updateDepartmentChartCenterText(departments);
                } else {
                    createDepartmentEmptyChart();
                }
            },
            error: function (xhr, status, error) {
                console.error("Error loading department uploads:", error);
                createDepartmentEmptyChart();
            }
        });
    }

    function updateDepartmentChartCenterText(departments) {
        const centerElement = document.querySelector('#department').closest('.chartjs-wrapper-demo').querySelector('.attendance-canvas');
        if (centerElement && departments.length > 0) {
            const topDepartment = departments[0];
            centerElement.innerHTML = `
            <p class="fs-13 mb-1">${topDepartment.departmentName}</p>
            <h3>${topDepartment.percentage}%</h3>
        `;
        }
    }

    function createDepartmentEmptyChart() {
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
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        const centerElement = document.querySelector('#department').closest('.chartjs-wrapper-demo').querySelector('.attendance-canvas');
        if (centerElement) {
            centerElement.innerHTML = `
            <p class="fs-13 mb-1 text-muted">No Data</p>
            <h3>0%</h3>
        `;
        }
    }


    // ==============================
    // Document Type Uploads Chart
    // ==============================
    function loadDocumentTypeUploads(projectId = '', period = 'today', departmentId = '') {
        if (!$('#documentUploads').length) return;

        const chartCanvas = document.getElementById('documentUploads');
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) existingChart.destroy();

        const params = new URLSearchParams();
        if (projectId) params.append('projectId', projectId);
        if (period) params.append('period', period);
        if (departmentId) params.append('departmentId', departmentId);

        const url = `${baseUrl}/api/dashboard/documentsTypeUploads?${params.toString()}`;

        $.ajax({
            url: url,
            method: "GET",
            dataType: "json",
            success: function (result) {
                if (result.success && result.data && result.data.fileTypeBreakdown?.length) {
                    const fileTypes = result.data.fileTypeBreakdown;
                    const labels = fileTypes.map(ft => ft.type);
                    const dataValues = fileTypes.map(ft => ft.percentage);

                    const ctx = chartCanvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Document Types (%)',
                                data: dataValues,
                                backgroundColor: ['#6610f2', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'].slice(0, labels.length),
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
                                    usePointStyle: true,
                                    callbacks: {
                                        title: function (context) {
                                            const fileType = fileTypes[context[0].dataIndex];
                                            return fileType.type;
                                        },
                                        label: function (context) {
                                            const fileType = fileTypes[context.dataIndex];
                                            return [
                                                `Documents: ${fileType.count}`,
                                                `Percentage: ${fileType.percentage}%`,
                                                `Total Size: ${fileType.totalSizeMB} MB`
                                            ];
                                        },
                                        labelPointStyle: function (context) {
                                            return {
                                                pointStyle: 'rectRounded',
                                                rotation: 0,
                                                backgroundColor: ['#6610f2', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'][context.dataIndex]
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    });

                    updateDocumentTypeChartCenterText(fileTypes);
                } else {
                    createDocumentTypeEmptyChart();
                }
            },
            error: function (xhr, status, error) {
                console.error("Error loading document type uploads:", error);
                createDocumentTypeEmptyChart();
            }
        });
    }

    function updateDocumentTypeChartCenterText(fileTypes) {
        const centerElement = document.querySelector('#documentUploads').closest('.chartjs-wrapper-demo').querySelector('.attendance-canvas');
        if (centerElement && fileTypes.length > 0) {
            // Show top file type by percentage
            const topFileType = fileTypes.sort((a, b) => b.percentage - a.percentage)[0];
            centerElement.innerHTML = `
            <p class="fs-13 mb-1">${topFileType.type}</p>
            <h3>${topFileType.percentage}%</h3>
        `;
        }
    }

    function createDocumentTypeEmptyChart() {
        const ctx = document.getElementById('documentUploads').getContext('2d');
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
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        const centerElement = document.querySelector('#documentUploads').closest('.chartjs-wrapper-demo').querySelector('.attendance-canvas');
        if (centerElement) {
            centerElement.innerHTML = `
            <p class="fs-13 mb-1 text-muted">No Data</p>
            <h3>0%</h3>
        `;
        }
    }

    // ==============================
    // Handle period dropdown selection for DEPARTMENT chart
    // ==============================
    $(document).on('click', '.period-option', function () {
        const selectedPeriod = $(this).data('period');
        const selectedLabel = $(this).text();

        // Update current period
        currentPeriod = selectedPeriod;

        // Update label in dropdown button
        $('#currentPeriodLabel').text(selectedLabel);

        // Reload chart with current project and new period
        loadDepartmentUploads(currentProjectId, selectedPeriod);
    });

    // ==============================
    // Handle period dropdown selection for DOCUMENT TYPE chart
    // ==============================
    $(document).on('click', '.period-option-type', function () {
        const selectedPeriod = $(this).data('period');
        const selectedLabel = $(this).text();

        // Update document type period
        typeUploadsperiod = selectedPeriod;

        // Update label in dropdown button
        $('#typePeriodLabel').text(selectedLabel);

        // Reload document type chart with current project and new period
        loadDocumentTypeUploads(currentProjectId, selectedPeriod);
    });

    // ==============================
    // Initialize and load everything
    // ==============================

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
        loadDocumentsFiltered(currentProjectId);
        initializeDonorSelect2();
        initializeVendorSelect2();

        loadDepartmentUploads(currentProjectId, currentPeriod);
        loadDocumentTypeUploads(currentProjectId, typeUploadsperiod);
    }

    // Start the dashboard
    initializeDashboard();
});