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
