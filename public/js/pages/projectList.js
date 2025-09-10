let projectsTable;

$(document).ready(function () {
    if ($('#projectsTable').length) {
        projectsTable = $('#projectsTable').DataTable({
            ajax: {
                url: '/api/projects/all-projects',
                dataSrc: 'data'
            },
            responsive: true,
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            order: [[0, "asc"]],
            dom: '<"row mb-2"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                '<"row"<"col-sm-12"tr>>' +
                '<"row mt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search projects...",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)",
                zeroRecords: "No matching records found",
                paginate: {
                    first: "« First",
                    last: "Last »",
                    next: "› Next",
                    previous: "‹ Prev"
                }
            },
            columns: [
                { data: "title" },
                {
                    data: "in_charge_list",
                    render: data => (!data?.length)
                        ? '<span class="text-muted">Not assigned</span>'
                        : `<ul class="list-unstyled mb-0">` +
                        data.map(emp => `<li><small>${emp.emp_name} (${emp.emp_code})</small></li>`).join('') +
                        `</ul>`
                },
                {
                    data: "manager_list",
                    render: data => (!data?.length)
                        ? '<span class="text-muted">Not assigned</span>'
                        : `<ul class="list-unstyled mb-0">` +
                        data.map(emp => `<li><small>${emp.emp_name} (${emp.emp_code})</small></li>`).join('') +
                        `</ul>`
                },
                { data: "start_date", render: d => d ? new Date(d).toLocaleDateString() : 'N/A' },
                { data: "end_date", render: d => d ? new Date(d).toLocaleDateString() : 'N/A' },
                { data: "duration" },
                {
                    data: "status",
                    render: status => {
                        let cls = 'secondary';
                        if (status === 'Active') cls = 'success';
                        else if (status === 'Completed') cls = 'primary';
                        else if (status === 'Pending') cls = 'warning';
                        return `<span class="badge bg-${cls}">${status}</span>`;
                    }
                },
                { data: "updated_on", render: d => d ? new Date(d).toLocaleString() : 'N/A' }
            ],
            columnDefs: [
                { responsivePriority: 1, targets: 0 },
                { responsivePriority: 2, targets: 6 },
                { orderable: false, targets: [1, 2, 5, 6] },
                { className: "dt-nowrap", targets: [3, 4, 7] }
            ],
            initComplete: function () {
                $('.dataTables_length select').addClass('form-select form-select-sm');
                $('.dataTables_filter input').addClass('form-control form-control-sm');
                $('.dataTables_paginate').addClass('pagination-sm');
            }
        });
    }
});

$(document).on('submit', '#sync-form', function (e) {
    e.preventDefault();

    $("#sync-button").prop("disabled", true)
        .html('<i class="ti ti-loader ti-spin me-1"></i> Syncing...');

    $.post('/api/projects/sync')
        .done(function (res) {
            if (projectsTable) {
                projectsTable.ajax.reload(null, false);
            }
            showSuccess(res.message || "Sync completed!");
            $('#last-sync-time').text(new Date().toLocaleString());
        })
        .fail(function (xhr) {
            showError("Sync failed: " + (xhr.responseJSON?.message || xhr.statusText));
        })
        .always(function () {
            $("#sync-button").prop("disabled", false)
                .html('<i class="ti ti-sync me-1"></i> Sync Now');
        });
});

// Fetch projects from API
function fetchProjects(search = '', callback) {
    $.ajax({
        url: '/api/projects',
        method: 'GET',
        data: {
            status: 'Active',
            page: 1,
            limit: 10,
            search: search
        },
        xhrFields: {
            withCredentials: true
        },
        success: function (response) {
            if (response.success) {
                callback(null, response.data.projects);
            } else {
                callback('No data received');
            }
        },
        error: function (err) {
            callback(err);
        }
    });
}

// Render projects into HTML
function renderProjects(projects) {
    let html = '';

    if (projects.length > 0) {
        projects.forEach(project => {
            html += `
                <div class="col-sm-3">
                    <div class="card projectcard">
                        <div class="card-body">
                            <h5 class="fs-20 fw-normal mb-2">${project.title}</h5>
                            <h6 class="fs-16 fw-normal text-neutral">
                                Department: ${project.manager_list.map(m => m.emp_name).join(', ')}
                            </h6>
                            <small class="fs-12 text-black fw-light">
                                Created on: ${new Date(project.add_date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </small>
                            <h6 class="fs-16 fw-normal mt-2 text-neutral">
                                In Charge: ${project.in_charge_list.map(i => i.emp_name).join(', ')}
                            </h6>
                            <div class="prjtxt mt-3">
                                <p class="fs-12 fw-light">Duration: ${project.duration} | Status: ${project.status}</p>
                                <div class="dflexbtwn">
                                    <a href="project-files.php?project_id=${project.project_id}" class="site-btnmd fw-light fs-12">Access Files</a>
                                    <span>0 Files</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html = `<div class="col-12"><p class="text-center">No projects found.</p></div>`;
    }

    $('#projectContainer').html(html);
}

// Handle loading projects (wrapper function)
function loadProjects(search = '') {
    fetchProjects(search, function (err, projects) {
        if (err) {
            console.error('Error fetching projects:', err);
            $('#projectContainer').html(`<div class="col-12"><p class="text-center text-danger">Failed to load projects.</p></div>`);
        } else {
            renderProjects(projects);
        }
    });
}

// Debounce function
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Initialize when DOM is ready
$(document).ready(function () {
    // Initial load
    loadProjects();

    // Search input with debounce
    $('.simplesrchbox').on('input', debounce(function () {
        let searchText = $(this).val();
        loadProjects(searchText);
    }, 300));
});
