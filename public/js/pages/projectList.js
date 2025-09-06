document.addEventListener('DOMContentLoaded', async () => {
    const projectsTable = document.getElementById('projects-table');

    // Fetch projects from API
    try {
        const response = await fetch(`${BASE_URL}/api/projects/all-projects`, {
            method: 'GET',
            credentials: 'include', // ensures cookies are sent
            // headers: {
            //     'Content-Type': 'application/json'
            // }
        });
        console.log("sdasd", response);
        if (!response.ok) throw new Error('Failed to fetch projects');

        const { data } = await response.json();
        console.log("json projects", data)
        if (!data || data.length === 0) {
            projectsTable.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-4">
                <div class="text-muted">
                    <i class="ti ti-info-circle fs-1"></i>
                    <p class="mt-2">No projects found</p>
                    <p>Click the Sync button to fetch data from the API</p>
                </div>
            </td>
        </tr>
    `;
            return;
        }

        projectsTable.innerHTML = data.map(project => `
    <tr>
        <td><strong>${project.title}</strong></td>
        <td>${project.logo ? `<img src="${project.logo}" width="40" height="40" class="rounded">` : '<span class="text-muted">No logo</span>'}</td>
        <td>${project.in_charge_list?.length
                ? '<ul class="list-unstyled mb-0">' + project.in_charge_list.map(emp => `<li><small>${emp.emp_name} (${emp.emp_code})</small></li>`).join('') + '</ul>'
                : '<span class="text-muted">Not assigned</span>'}
        </td>
        <td>${project.manager_list?.length
                ? '<ul class="list-unstyled mb-0">' + project.manager_list.map(emp => `<li><small>${emp.emp_name} (${emp.emp_code})</small></li>`).join('') + '</ul>'
                : '<span class="text-muted">Not assigned</span>'}
        </td>
        <td>${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
        <td>${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</td>
        <td>${project.duration || 'N/A'}</td>
        <td><span class="badge bg-${project.status === 'Active' ? 'success' : project.status === 'Completed' ? 'primary' : project.status === 'Pending' ? 'warning' : 'secondary'}">${project.status}</span></td>
        <td><small class="text-muted">${project.updated_on ? new Date(project.updated_on).toLocaleString() : 'N/A'}</small></td>
    </tr>
    `).join('');



    } catch (err) {
        console.error(err);
        projectsTable.innerHTML = `
    <tr>
        <td colspan="9" class="text-center text-danger py-4">Failed to load projects.</td>
    </tr>
    `;
    }

    // Handle Sync Button
    const syncForm = document.getElementById('sync-form');
    const syncButton = document.getElementById('sync-button');
    const lastSyncTime = document.getElementById('last-sync-time');

    syncForm.addEventListener('submit', () => {
        syncButton.innerHTML = '<i class="ti ti-sync fa-spin me-1"></i> Syncing...';
        syncButton.disabled = true;
    });

    // Update last sync time every minute
    setInterval(() => {
        lastSyncTime.textContent = new Date().toLocaleString();
    }, 60000);
});