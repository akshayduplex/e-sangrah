document.addEventListener("DOMContentLoaded", () => {

    const toggleLoader = (btn, loading = true) => {
        if (!btn) return;
        const text = btn.querySelector(".btn-text");
        const spinner = btn.querySelector(".spinner-border");

        if (loading) {
            btn.disabled = true;
            if (text) text.classList.add("d-none");
            if (spinner) spinner.classList.remove("d-none");
        } else {
            btn.disabled = false;
            if (text) text.classList.remove("d-none");
            if (spinner) spinner.classList.add("d-none");
        }
    };

    const appendMultiSelects = (formData, fields) => {
        fields.forEach(f => {
            const values = formData.getAll(f + "[]");
            formData.delete(f + "[]");
            values.forEach(v => formData.append(f, v));
        });
    };

    // -----------------------------
    // Toggle View/Edit Mode
    // -----------------------------
    const toggleBtn = document.getElementById("toggleModeBtn");
    const viewDiv = document.getElementById("viewMode");
    const editDiv = document.getElementById("editMode");
    const cancelBtn = document.getElementById("cancelEditBtn");

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

    // -----------------------------
    // Project Date Restrictions & Duration
    // -----------------------------
    const setupProjectDateRestrictions = () => {
        const startDatePicker = $('input[name="projectStartDate"]').datetimepicker({
            format: 'DD-MM-YYYY',
            useCurrent: false
        });

        const endDatePicker = $('input[name="projectEndDate"]').datetimepicker({
            format: 'DD-MM-YYYY',
            useCurrent: false
        });

        const durationInput = $('input[name="projectDuration"]');

        const updateDuration = () => {
            const start = startDatePicker.data("DateTimePicker").date();
            const end = endDatePicker.data("DateTimePicker").date();

            if (start && end) {
                const days = end.diff(start, 'days') + 1;
                durationInput.val(days);
            } else {
                durationInput.val('');
            }
        };

        // Start Date change
        startDatePicker.on('dp.change', function (e) {
            const startDate = e.date;
            const endPicker = endDatePicker.data("DateTimePicker");

            if (startDate) {
                endPicker.minDate(startDate);

                const currentEnd = endPicker.date();
                if (currentEnd && currentEnd.isBefore(startDate)) {
                    endPicker.clear();
                    showToast('End Date cleared because it was before the selected Start Date', 'info');
                }
            } else {
                endPicker.minDate(false);
            }

            updateDuration();
        });

        // End Date change
        endDatePicker.on('dp.change', function (e) {
            const endDate = e.date;
            const startPicker = startDatePicker.data("DateTimePicker");

            if (endDate) {
                const currentStart = startPicker.date();
                if (currentStart && currentStart.isAfter(endDate)) {
                    startPicker.date(endDate);
                    showToast('Start Date adjusted to not be after End Date', 'warning');
                }
            }

            updateDuration();
        });

        // Initialize duration if pre-filled
        updateDuration();
    };

    setupProjectDateRestrictions();
    // Auto-set designation when user is selected
    if (e.target.classList.contains('user-select')) {
        const userSelect = e.target;
        const selectedOption = userSelect.selectedOptions[0];
        const defaultDesignationId = selectedOption.getAttribute('data-designation');

        // Find the designation select in the same row
        const row = userSelect.closest('.approval-authority-row');
        const designationSelect = row.querySelector('select[name*="[designation]"]');

        // Reset the designation select options (keeps all designations)
        const allOptions = Array.from(designationSelect.options);
        allOptions.forEach(opt => opt.selected = false);

        // Set the user's default designation if available
        if (defaultDesignationId) {
            const optionToSelect = Array.from(designationSelect.options).find(opt => opt.value === defaultDesignationId);
            if (optionToSelect) optionToSelect.selected = true;
        }

        // Trigger Select2 update if used
        $(designationSelect).trigger('change');
    }
    // -----------------------------
    // Form Submissions
    // -----------------------------
    const addForm = document.getElementById("addProjectForm");
    const editForm = document.getElementById("editProjectForm");

    const handleFormSubmit = async (form, url, method = "POST") => {
        const submitBtn = form.querySelector(".submitBtn");
        toggleLoader(submitBtn, true);

        const formData = new FormData(form);
        appendMultiSelects(formData, ["donor", "vendor", "projectCollaborationTeam"]);

        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();

            if (res.ok) {
                if (method === "POST") {
                    const successModalEl = document.getElementById("data-success-register");
                    const successModal = new bootstrap.Modal(successModalEl);
                    successModal.show();
                    form.reset();
                    toggleLoader(submitBtn, false);
                    successModalEl.addEventListener("hidden.bs.modal", () => window.location.href = "/projects");
                } else {
                    showToast("Project updated successfully!", "success");
                    const projectId = document.getElementById("projectDetails").dataset.projectId;
                    window.location.href = `/projects/${projectId}/details`;
                }
            } else {
                showToast(data.message || "Failed to process project", "error");
                toggleLoader(submitBtn, false);
            }
        } catch (err) {
            showToast("Something went wrong: " + err, "error");
            toggleLoader(submitBtn, false);
        }
    };

    if (addForm) {
        addForm.addEventListener("submit", e => {
            e.preventDefault();
            handleFormSubmit(addForm, `${baseUrl}/api/projects`, "POST");
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", e => {
            e.preventDefault();
            const projectId = document.getElementById("projectDetails").dataset.projectId;
            handleFormSubmit(editForm, `${baseUrl}/api/projects/${projectId}`, "PATCH");
        });
    }

});
