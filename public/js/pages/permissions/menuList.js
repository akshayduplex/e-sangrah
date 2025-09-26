
let menuIdToDelete = null; // Global variable to track which menu to delete
let menuTable;
let allMenuData = [];

// Fetch all menu data and initialize DataTable
function fetchAllMenuData() {
    fetch('/api/menu?limit=0')
        .then(res => res.json())
        .then(result => {
            if (!result.success || !Array.isArray(result.data)) {
                showToast("Invalid API response:" + result, 'error');
                return;
            }
            allMenuData = result.data;
            initializeDataTable();
        })
        .catch(err => showToast("Error loading data:" + err, 'error'));
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
            { data: null, render: (d, t, r, meta) => meta.row + 1 }, // Sr No
            { data: "type" },
            { data: "name" },
            {
                data: "url",
                render: data => (!data || data === "#") ? "#" : (data.startsWith("/") ? data : `/${data}`)
            },
            { data: "priority" },
            {
                data: "is_show",
                render: (data, type, row) => `
                    <div class="form-check form-switch">
                        <input class="form-check-input toggleShow" type="checkbox" 
                            data-id="${row._id}" ${data ? "checked" : ""}>
                        <label class="form-check-label">${data ? "Yes" : "No"}</label>
                    </div>`
            },
            { data: "add_date", render: d => d ? new Date(d).toLocaleDateString("en-IN") : "-" },
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

// Attach toggle switch handlers
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
                showToast("Toggle error:" + err, "error");
                $(this).prop("checked", !checked);
                showToast?.("Server error", "error");
            });
    });
}

// Show delete confirmation modal
function confirmDelete(menuId) {
    menuIdToDelete = menuId;
    const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    deleteModal.show();
}

// Delete menu
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

                // Remove the row from DataTable
                const row = $('#menuTable').find(`a[onclick="confirmDelete('${menuIdToDelete}')"]`).closest('tr');
                menuTable.row(row).remove().draw(false);

                // Remove from global array
                allMenuData = allMenuData.filter(menu => menu._id !== menuIdToDelete);
            } else {
                showToast('Error deleting menu: ' + data.message, "error");
            }
        })
        .catch(err => {
            showToast('Error deleting menu', "error");
        })
        .finally(() => {
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            deleteModal.hide();
            menuIdToDelete = null;
        });
});

// Initial fetch on document ready
$(document).ready(function () {
    fetchAllMenuData();
});
