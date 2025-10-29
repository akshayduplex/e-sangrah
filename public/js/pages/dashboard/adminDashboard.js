$(document).ready(function () {
    const baseUrl = window.baseUrl;
    // Initialize Select2 for Recent Activity Department
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
    // Load Recent Activities
    async function loadRecentActivities() {
        try {
            const response = await fetch(`${baseUrl}/api/dashboard/recent-activity`);
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

                // Format date to DD/MM/YYYY
                const date = new Date(activity.timestamp);
                const formattedDate = date.toLocaleDateString('en-GB'); // e.g. 27/10/2025

                const cardItem = `
               <div class="dflexbtwn mb-2" style="display: flex; justify-content: space-between; align-items: center;">
    <!-- Left side: icon + sentence -->
    <div class="flxtblleft gap-0" style="display: flex; align-items: center;">
        <img src="/img/icons/usrround.png" alt="User" style="width: 32px; height: 32px;">
        <div class="flxtbltxt ms-3">
            <p class="fs-16 mb-1 fw-normal">
                ${user} has ${action.toLowerCase()} the document ${docName} ${version}
            </p>
        </div>
    </div>

    <!-- Right side: date only -->
    <div class="flxtblright">
        <p class="fs-13 text-muted mb-0">${formattedDate}</p>
    </div>
</div>

            `;
                container.append(cardItem);
            });

        } catch (err) {
            console.error('Error loading recent activities:', err);
        }
    }
    // Initialize Select2 for Upload Department
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
            console.log("Selected Upload Department ID:", $(this).val());
        });
    }

    // Call both initializations
    initializeRecentActivityDepartment();
    initializeUploadDepartment();
    loadRecentActivities();
    // Load dashboard stats
    $.ajax({
        url: `${baseUrl}/api/dashboard/stats`,
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

    // Load documents
    async function loadDocuments() {
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

    // Call the function to load documents
    loadDocuments();
});
