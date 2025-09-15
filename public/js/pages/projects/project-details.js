
// Toggle view/edit
document.getElementById('toggleModeBtn').addEventListener('click', function () {
    const view = document.getElementById('viewMode');
    const edit = document.getElementById('editMode');
    const btn = this;
    if (view.style.display === 'none') {
        view.style.display = 'block';
        edit.style.display = 'none';
        btn.innerHTML = '<i class="ti ti-pencil me-1"></i> Edit';
    } else {
        view.style.display = 'none';
        edit.style.display = 'block';
        btn.innerHTML = '<i class="ti ti-eye me-1"></i> View';
    }
});

// Cancel
document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('toggleModeBtn').click();
});

// Save form
document.getElementById('editProjectForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const projectId = document.getElementById("projectDetails").dataset.projectId;

    const data = Object.fromEntries(new FormData(this).entries());

    try {
        const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showToast(result.message, "success", 1000);
            setTimeout(() => {
                window.location.href = `/projects/${projectId}/project-details`;
            }, 1000);
        } else {
            showToast("Update failed: " + result.message, "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error: " + err, "error")
    }
});
