// document.addEventListener('DOMContentLoaded', () => {
//     const designationSelect = document.getElementById('designation_id');
//     const assignMenuForm = document.getElementById('assignMenuForm');
//     const selectAllBtn = document.getElementById('btnSelectAll');
//     const allCheckboxes = () => assignMenuForm.querySelectorAll('input[type="checkbox"]');

//     let assignedMenus = [];

//     // --- Load assigned menus ---
//     designationSelect.addEventListener('change', async function () {
//         const designationId = this.value;
//         assignedMenus = [];

//         allCheckboxes().forEach(cb => (cb.checked = false));
//         if (!designationId) return;

//         try {
//             const res = await fetch(`/api/assign-menu/designation/${designationId}/menus`);
//             const data = await res.json();

//             assignedMenus = data.success && Array.isArray(data.data) ? data.data : [];
//             assignedMenus.forEach(menuId => {
//                 const cb = assignMenuForm.querySelector(`input[value="${menuId}"]`);
//                 if (cb) cb.checked = true;
//             });
//         } catch (err) {
//             console.error(err);
//             showError('Failed to fetch assigned menus.');
//         }
//     });

//     // --- Select All toggle ---
//     selectAllBtn.addEventListener('click', () => {
//         const boxes = Array.from(allCheckboxes());
//         const allChecked = boxes.every(cb => cb.checked);
//         boxes.forEach(cb => (cb.checked = !allChecked));
//     });

//     // --- Save assignment ---
//     assignMenuForm.addEventListener('submit', async e => {
//         e.preventDefault();

//         const designationId = designationSelect.value;
//         if (!designationId) return showWarning('Please select a designation first.');

//         const selected = Array.from(allCheckboxes())
//             .filter(cb => cb.checked)
//             .map(cb => cb.value);

//         const toAssign = selected.filter(id => !assignedMenus.includes(id));
//         const toUnassign = assignedMenus.filter(id => !selected.includes(id));

//         if (toAssign.length === 0 && toUnassign.length === 0) {
//             return showInfo('No changes to save.');
//         }

//         try {
//             const requests = [];

//             if (toAssign.length > 0) {
//                 requests.push(fetch('/api/assign-menu/assign', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ designation_id: designationId, menu_ids: toAssign })
//                 }));
//             }

//             if (toUnassign.length > 0) {
//                 requests.push(fetch('/api/assign-menu/unselect', {
//                     method: 'DELETE',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ designation_id: designationId, menu_ids: toUnassign })
//                 }));
//             }

//             const responses = await Promise.all(requests);
//             const results = await Promise.all(responses.map(r => r.json()));

//             const failed = results.filter(r => !r.success);

//             if (failed.length === 0) {
//                 assignedMenus = selected;
//                 showSuccess('Menu assignments updated successfully!');
//             } else {
//                 console.error("Assignment API errors:", failed);
//                 showError(`Some requests failed: ${failed.map(f => f.message).join(", ")}`);
//             }

//         } catch (err) {
//             console.error(err);
//             showError('Error updating menus.');
//         }
//     });
// });

// // Delete confirmation
// function confirmDelete(menuId) {
//     if (confirm('Are you sure you want to delete this menu?')) {
//         fetch(`/api/menu/${menuId}`, {
//             method: 'DELETE',
//             headers: { 'Content-Type': 'application/json' }
//         })
//             .then(res => res.json())
//             .then(data => {
//                 if (data.success) {
//                     alert('Menu deleted successfully');
//                     location.reload();
//                 } else {
//                     alert('Error deleting menu: ' + data.message);
//                 }
//             })
//             .catch(err => {
//                 console.error('Error:', err);
//                 alert('Error deleting menu');
//             });
//     }
// }
// if ($.fn.DataTable.isDataTable('#menuTable')) {
//     $('#menuTable').DataTable().destroy();
// }
// // Init DataTable
// $('#menuTable').DataTable({
//     pageLength: 10,
//     lengthMenu: [10, 25, 50, 100],
//     ordering: true,
//     serverSide: true,
//     processing: true,
//     ajax: function (data, callback) {
//         const page = Math.floor(data.start / data.length) + 1;
//         fetch(`/api/menu?page=${page}&limit=${data.length}`)
//             .then(res => res.json())
//             .then(result => {
//                 callback({
//                     recordsTotal: result.pagination.total,
//                     recordsFiltered: result.pagination.total,
//                     data: result.data
//                 });
//             });
//     },
//     columns: [
//         {
//             data: null,
//             render: function (data, type, row, meta) {
//                 return meta.row + meta.settings._iDisplayStart + 1;
//             }
//         },
//         { data: 'type' },
//         { data: 'url', render: data => `/${data}` },
//         { data: 'name' },
//         { data: 'priority' },
//         {
//             data: 'is_show',
//             render: function (data, type, row) {
//                 return `
//                 <div class="form-check form-switch">
//                     <input class="form-check-input" type="checkbox" role="switch"
//                         id="isShow_${row._id}" ${data ? "checked" : ""}>
//                     <label class="form-check-label" for="isShow_${row._id}">
//                         ${data ? "Yes" : "No"}
//                     </label>
//                 </div>`;
//             }
//         },
//         { data: 'add_date', render: data => new Date(data).toLocaleDateString('en-IN') },
//         {
//             data: '_id',
//             render: (data) => `
//                 <div class="action-icon d-inline-flex">
//                     <a href="/menu/edit/${data}" id="edit_${data}" class="me-2">
//                         <i class="ti ti-edit"></i>
//                     </a>
//                     <a href="javascript:void(0);" id="delete_${data}"
//                        class="deleteMenuBtn" data-id="${data}"
//                        onclick="confirmDelete('${data}')">
//                         <i class="ti ti-trash"></i>
//                     </a>
//                 </div>
//             `
//         }
//     ],
//     columnDefs: [
//         { orderable: false, targets: -1 } // disable sorting on "Action"
//     ]
// });

// document.addEventListener("DOMContentLoaded", function () {
//     const typeSelect = document.getElementById("type");
//     const masterField = document.getElementById("masterField");
//     const masterSelect = document.getElementById("master_id");
//     const form = document.getElementById("menuForm");

//     function toggleMasterField() {
//         if (typeSelect.value === "Menu") {
//             masterField.style.display = "block";
//             masterSelect.disabled = false;
//         } else {
//             masterField.style.display = "none";
//             masterSelect.value = "";
//             masterSelect.disabled = true;
//         }
//     }

//     typeSelect.addEventListener("change", toggleMasterField);
//     toggleMasterField(); // run on load

//     form.addEventListener("submit", async function (e) {
//         e.preventDefault();
//         const formData = new FormData(form);
//         const data = Object.fromEntries(formData.entries());

//         const url = "<%= menu ? `/api/menu/${menu._id}` : '/api/menu' %>";
//         const method = "<%= menu ? 'PUT' : 'POST' %>";

//         try {
//             const response = await fetch(url, {
//                 method: method,
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(data)
//             });

//             const result = await response.json();

//             if (result.success) {
//                 showSuccess("<%= menu ? 'Menu updated successfully' : 'Menu added successfully' %>");
//                 setTimeout(() => {
//                     window.location.href = "/menu/list";
//                 }, 1500);
//             } else {
//                 showError(result.message || "Something went wrong");
//             }
//         } catch (err) {
//             console.error(err);
//             showError(err.message || "An error occurred");
//         }
//     });
// });