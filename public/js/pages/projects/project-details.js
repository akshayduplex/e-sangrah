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
                showToast("Something went wrong while creating the project." + err, "error");
            }
        });
    }


    // Submit handler for Edit Project
    if (editForm) {
        editForm.addEventListener("submit", async e => {
            e.preventDefault();
            const projectId = document.getElementById("projectDetails").dataset.projectId;
            const formData = new FormData(editForm);

            // Multi-select fields
            ["donor", "vendor", "projectCollaborationTeam"].forEach(field => {
                const values = formData.getAll(field + "[]");
                formData.delete(field + "[]");
                values.forEach(v => formData.append(field, v));
            });

            try {
                const res = await fetch(`/api/projects/${projectId}`, {
                    method: "PATCH",
                    body: formData // send as FormData, do NOT stringify
                    // headers: do NOT set Content-Type; browser will handle it
                });
                const result = await res.json();
                if (res.ok) {
                    showToast("Project updated successfully!", "success");
                    window.location.reload();
                } else {
                    showToast(result.message || "Failed to update project", "error");
                }
            } catch (err) {
                showToast("Something went wrong while updating the project.", "error");
            }
        });

    }
});


