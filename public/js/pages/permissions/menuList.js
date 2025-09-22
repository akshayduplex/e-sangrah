let menuIdToDelete = null; // Global variable to track which menu to delete
// Delete confirmation
function confirmDelete(menuId) {
    menuIdToDelete = menuId;
    // Show the Bootstrap modal
    const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    deleteModal.show();
}
document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (!menuIdToDelete) return;

    fetch(`/api/menu/${menuIdToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('Menu deleted successfully', "success");
                location.reload(); // Or remove row from DataTable without reload
            } else {
                showToast('Error deleting menu: ' + data.message, "error");
            }
        })
        .catch(err => {
            console.error('Error:', err);
            showToast('Error deleting menu', "error");
        })
        .finally(() => {
            // Hide modal after action
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            deleteModal.hide();
            menuIdToDelete = null;
        });
});

let menuTable;

// Debounce helper
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

$(document).ready(function () {
    let menuTable;
    let allMenuData = [];

    // Fetch all menu data
    function fetchAllMenuData() {
        fetch('/api/menu?limit=0')
            .then(res => res.json())
            .then(result => {
                if (!result.success || !Array.isArray(result.data)) {
                    console.error("Invalid API response:", result);
                    return;
                }

                allMenuData = result.data;
                initializeDataTable();
            })
            .catch(err => {
                console.error("Error loading data:", err);
            });
    }

    // Initialize DataTable
    function initializeDataTable() {
        if ($.fn.DataTable.isDataTable('#menuTable')) {
            $('#menuTable').DataTable().clear().destroy();
        }

        menuTable = $('#menuTable').DataTable({
            data: allMenuData,
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            ordering: true,
            processing: true,
            searching: true,
            columns: [
                { data: null, render: (d, t, r, meta) => meta.row + 1 },
                { data: "type" },
                { data: "name" },
                {
                    data: "url",
                    render: data => {
                        if (!data || data === "#") return "#";
                        return data.startsWith("/") ? data : `/${data}`;
                    }
                },
                { data: "priority" },
                {
                    data: "is_show",
                    render: (data, type, row) => `
                        <div class="form-check form-switch">
                          <input class="form-check-input toggleShow" type="checkbox" 
                              data-id="${row._id}" ${data ? "checked" : ""}>
                          <label class="form-check-label">
                              ${data ? "Yes" : "No"}
                          </label>
                        </div>`
                },
                {
                    data: "add_date",
                    render: d => d ? new Date(d).toLocaleDateString("en-IN") : "-"
                },
                {
                    data: "_id",
                    orderable: false,
                    render: id => `
                        <div class="action-icon d-inline-flex">
                          <a href="/permissions/menu/add/${id}" class="me-2"><i class="ti ti-edit"></i></a>
                          <a href="javascript:void(0);" onclick="confirmDelete('${id}')">
                              <i class="ti ti-trash"></i>
                          </a>
                        </div>`
                }
            ]
        });

        // Re-attach handlers after redraw
        menuTable.on('draw', function () {
            attachToggleHandlers();
        });

        attachToggleHandlers();
    }

    // Toggle status
    function attachToggleHandlers() {
        $('.toggleShow').off('change').on('change', function () {
            const menuId = $(this).data("id");
            const checked = $(this).is(":checked");
            const label = $(this).siblings("label");

            fetch(`/api/menu/${menuId}/toggle-status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        label.text(data.data.is_show ? "Yes" : "No");
                        showToast?.("Status updated", "success");
                    } else {
                        $(this).prop("checked", !checked);
                        showToast?.("Error: " + data.message, "error");
                    }
                })
                .catch(err => {
                    console.error("Toggle error:", err);
                    $(this).prop("checked", !checked);
                    showToast?.("Server error", "error");
                });
        });
    }

    // Run fetch
    fetchAllMenuData();
});