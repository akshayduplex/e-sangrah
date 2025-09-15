
document.addEventListener('DOMContentLoaded', () => {
    const designationSelect = document.getElementById('designation_id');
    const assignMenuForm = document.getElementById('assignMenuForm');
    const selectAllBtn = document.getElementById('btnSelectAll');
    const allCheckboxes = () => assignMenuForm.querySelectorAll('input[type="checkbox"]');

    let assignedMenus = [];

    // --- Load assigned menus ---
    designationSelect.addEventListener('change', async function () {
        const designationId = this.value;
        assignedMenus = [];

        allCheckboxes().forEach(cb => (cb.checked = false));
        if (!designationId) return;

        try {
            const res = await fetch(`/api/assign-menu/designation/${designationId}/menus`);
            const data = await res.json();

            assignedMenus = data.success && Array.isArray(data.data) ? data.data : [];
            assignedMenus.forEach(menuId => {
                const cb = assignMenuForm.querySelector(`input[value="${menuId}"]`);
                if (cb) cb.checked = true;
            });
        } catch (err) {
            console.error(err);
            showToast('Failed to fetch assigned menus.', "error");
        }
    });

    // --- Select All toggle ---
    selectAllBtn.addEventListener('click', () => {
        const boxes = Array.from(allCheckboxes());
        const allChecked = boxes.every(cb => cb.checked);
        boxes.forEach(cb => (cb.checked = !allChecked));
    });

    // --- Save assignment ---
    assignMenuForm.addEventListener('submit', async e => {
        e.preventDefault();

        const designationId = designationSelect.value;
        if (!designationId) return showToast('Please select a designation first.', "warning");

        const selected = Array.from(allCheckboxes())
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        const toAssign = selected.filter(id => !assignedMenus.includes(id));
        const toUnassign = assignedMenus.filter(id => !selected.includes(id));

        if (toAssign.length === 0 && toUnassign.length === 0) {
            return showToast('No changes to save.', "info");
        }

        try {
            const requests = [];

            if (toAssign.length > 0) {
                requests.push(fetch('/api/assign-menu/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ designation_id: designationId, menu_ids: toAssign })
                }));
            }

            if (toUnassign.length > 0) {
                requests.push(fetch('/api/assign-menu/unselect', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ designation_id: designationId, menu_ids: toUnassign })
                }));
            }

            const responses = await Promise.all(requests);
            const results = await Promise.all(responses.map(r => r.json()));

            const failed = results.filter(r => !r.success);

            if (failed.length === 0) {
                assignedMenus = selected;
                showToast('Menu assignments successfully!', 'success', 1000);
                setTimeout(() => window.location.reload(), 1200);

            } else {
                console.error("Assignment API errors:", failed);
                showToast(`Some requests failed: ${failed.map(f => f.message).join(", ")}`, "error");
            }

        } catch (err) {
            console.error(err);
            showToast('Error updating menus.', 'error');
        }
    });
});