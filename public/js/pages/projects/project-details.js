
// // Toggle view/edit
// document.getElementById('toggleModeBtn').addEventListener('click', function () {
//     const view = document.getElementById('viewMode');
//     const edit = document.getElementById('editMode');
//     const btn = this;
//     if (view.style.display === 'none') {
//         view.style.display = 'block';
//         edit.style.display = 'none';
//         btn.innerHTML = '<i class="ti ti-pencil me-1"></i> Edit';
//     } else {
//         view.style.display = 'none';
//         edit.style.display = 'block';
//         btn.innerHTML = '<i class="ti ti-eye me-1"></i> View';
//     }
// });

// // Cancel
// document.getElementById('cancelEditBtn').addEventListener('click', () => {
//     document.getElementById('toggleModeBtn').click();
// });

// // Save form
// document.getElementById('editProjectForm').addEventListener('submit', async function (e) {
//     e.preventDefault();
//     const projectId = document.getElementById("projectDetails").dataset.projectId;

//     let data = Object.fromEntries(new FormData(this).entries());

//     // Handle multi-selects (FormData returns string if only one value, otherwise multiple entries)
//     const formData = new FormData(this);
//     data.donor = formData.getAll("donor");   // <-- FIX
//     data.vendor = formData.getAll("vendor"); // <-- FIX
//     data.projectCollaborationTeam = formData.getAll("projectCollaborationTeam");

//     // Remove duration: backend computes it automatically
//     delete data.projectDuration;

//     try {
//         const res = await fetch(`/api/projects/${projectId}`, {
//             method: 'PATCH',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(data)
//         });

//         const result = await res.json();
//         if (res.ok) {
//             showToast(result.message || "Project updated successfully", "success", 1000);
//             setTimeout(() => {
//                 window.location.href = `/projects/${projectId}/project-details`;
//             }, 1000);
//         } else {
//             showToast("Update failed: " + (result.message || "Unknown error"), "error");
//         }
//     } catch (err) {
//         console.error(err);
//         showToast("Error: " + err.message, "error");
//     }
// });

document.addEventListener("DOMContentLoaded", () => {
    const addForm = document.getElementById("addProjectForm");
    const editForm = document.getElementById("editProjectForm");
    const toggleBtn = document.getElementById("toggleModeBtn");
    const viewDiv = document.getElementById("viewMode");
    const editDiv = document.getElementById("editMode");
    const cancelBtn = document.getElementById("cancelEditBtn");

    // Helper: convert multi-select FormData to arrays
    const appendMultiSelects = (formData, fields) => {
        fields.forEach(f => {
            const values = formData.getAll(f + "[]");
            formData.delete(f + "[]");
            values.forEach(v => formData.append(f, v));
        });
    };

    // Toggle Edit/View
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            if (viewDiv.style.display === "none") {
                viewDiv.style.display = "block";
                editDiv.style.display = "none";
                toggleBtn.innerHTML = '<i class="ti ti-pencil me-1"></i> Edit';
            } else {
                viewDiv.style.display = "none";
                editDiv.style.display = "block";
                toggleBtn.innerHTML = '<i class="ti ti-eye me-1"></i> View';
            }
        });
    }

    if (cancelBtn) cancelBtn.addEventListener("click", () => toggleBtn.click());

    // Submit handler for Add Project
    if (addForm) {
        addForm.addEventListener("submit", async e => {
            e.preventDefault();
            const formData = new FormData(addForm);
            appendMultiSelects(formData, ["donor", "vendor", "projectCollaborationTeam"]);

            try {
                const res = await fetch("/api/projects", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    // Show the success modal instead of toast
                    const successModalEl = document.getElementById("data-success-register");
                    const successModal = new bootstrap.Modal(successModalEl);
                    successModal.show();

                    // Optional: reset the form after success
                    addForm.reset();

                    // Optional: redirect when user clicks "Ok" button in modal
                    successModalEl.querySelector("button[data-bs-dismiss='modal']").addEventListener("click", () => {
                        window.location.href = "/projects";
                    });
                } else {
                    showToast(data.message || "Failed to create project", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Something went wrong while creating the project.", "error");
            }
        });
    }


    // Submit handler for Edit Project
    if (editForm) {
        editForm.addEventListener("submit", async e => {
            e.preventDefault();
            const projectId = document.getElementById("projectDetails").dataset.projectId;
            const formData = new FormData(editForm);
            appendMultiSelects(formData, ["donor", "vendor", "projectCollaborationTeam"]);

            // Convert FormData to JSON for backend
            const body = {};
            formData.forEach((value, key) => {
                if (body[key]) {
                    // convert repeated keys to array
                    body[key] = [].concat(body[key], value);
                } else {
                    body[key] = value;
                }
            });

            try {
                const res = await fetch(`/api/projects/${projectId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const result = await res.json();
                if (res.ok) {
                    showToast("Project updated successfully!", "success");
                    window.location.reload();
                } else {
                    showToast(result.message || "Failed to update project", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Something went wrong while updating the project.", "error");
            }
        });
    }
});


