// // API endpoints (loaded from environment or config in production)
// const API_BASE_URL = window.env?.API_BASE_URL || '/api/documents';
// const DASHBOARD_API_URL = window.env?.DASHBOARD_API_URL || '/api/dashboard';
// const DEPARTMENT_STATS_API_URL = window.env?.DEPARTMENT_STATS_API_URL || '/api/dashboard/department-document-uploads';
// const UPLOADS_TRENDS_API_URL = window.env?.UPLOADS_TRENDS_API_URL || '/api/dashboard/department-documents';

// // Store uploaded files
// let uploadedFiles = [];
// let recentDocsState = {
//     page: 1,
//     limit: 10,
//     departmentId: '',
//     sortBy: ''
// };
// let managerChoices;

// // Initialize dashboard on DOM content loaded
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initDashboard);
// } else {
//     initDashboard();
// }

// // Main dashboard initialization
// function initDashboard() {
//     // Initialize Project dropdown
//     SearchableDropdown.init('#projectName', { placeholderValue: 'Select a project' });

//     // Initialize Department dropdown
//     SearchableDropdown.init('#department', { placeholderValue: 'Select a department' });

//     // Initialize Project Manager dropdown (will be dynamically populated)
//     SearchableDropdown.init('#projectManager', { placeholderValue: 'Select project first' });
//     setupSidebar();
//     setupSearch();
//     setupModal();
//     setupUploadFilters();
//     setupDepartmentStatsFilter();
//     setupHighchartsAnimation();
//     setupCharts();
//     checkScreenSize();
//     loadDashboardData();
// }

// // Setup sidebar toggle and submenu functionality
// function setupSidebar() {
//     const menuItems = document.querySelectorAll('.menu-item.with-submenu');
//     menuItems.forEach(item => {
//         item.addEventListener('click', () => {
//             const submenu = item.nextElementSibling;
//             const arrow = item.querySelector('.menu-arrow i');
//             submenu.classList.toggle('open');
//             arrow.style.transform = submenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
//         });
//     });

//     const menuToggle = document.querySelector('.menu-toggle');
//     const sidebar = document.querySelector('.sidebar');
//     if (menuToggle) {
//         menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
//     }
// }

// // Setup search functionality
// function setupSearch() {
//     const searchButton = document.querySelector('.search-bar button');
//     const searchInput = document.querySelector('.search-bar input');
//     if (searchButton && searchInput) {
//         searchButton.addEventListener('click', () => performSearch(searchInput.value));
//         searchInput.addEventListener('keypress', e => {
//             if (e.key === 'Enter') performSearch(searchInput.value);
//         });
//     }
// }

// // Setup modal functionality
// function setupModal() {
//     const modal = document.getElementById('addDocumentModal');
//     const addDocumentBtn = document.getElementById('addDocumentBtn');
//     const headerUploadBtn = document.getElementById('headerUploadBtn');
//     const closeModalBtn = document.getElementById('closeModal');
//     const cancelModalBtn = document.getElementById('cancelModalBtn');
//     const submitDocumentBtn = document.getElementById('submitDocumentBtn');

//     if (addDocumentBtn) addDocumentBtn.addEventListener('click', openAddDocumentModal);
//     if (headerUploadBtn) headerUploadBtn.addEventListener('click', openAddDocumentModal);
//     if (closeModalBtn) closeModalBtn.addEventListener('click', closeAddDocumentModal);
//     if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeAddDocumentModal);
//     if (submitDocumentBtn) submitDocumentBtn.addEventListener('click', submitDocumentForm);

//     if (modal) {
//         modal.addEventListener('click', e => {
//             if (e.target === modal) closeAddDocumentModal();
//         });
//     }

//     document.addEventListener('keydown', e => {
//         if (e.key === 'Escape') closeAddDocumentModal();
//     });

//     // Compliance radio button toggle
//     document.querySelectorAll('input[name="compliance"]').forEach(radio => {
//         radio.addEventListener('change', () => {
//             const expiryContainer = document.getElementById('expiryDateContainer');
//             if (expiryContainer) {
//                 expiryContainer.style.display = radio.value === 'yes' ? 'block' : 'none';
//             }
//         });
//     });

//     // File upload handling
//     setupFileUpload();
// }

// // Setup file upload area
// function setupFileUpload() {
//     const uploadArea = document.getElementById('uploadArea');
//     if (!uploadArea) return;

//     uploadArea.addEventListener('click', () => {
//         const input = document.createElement('input');
//         input.type = 'file';
//         input.multiple = true;
//         input.onchange = e => handleFiles(e.target.files);
//         input.click();
//     });

//     uploadArea.addEventListener('dragover', e => {
//         e.preventDefault();
//         uploadArea.style.borderColor = '#6B46C1';
//         uploadArea.style.backgroundColor = '#f0f0f0';
//     });

//     uploadArea.addEventListener('dragleave', () => {
//         uploadArea.style.borderColor = '#ddd';
//         uploadArea.style.backgroundColor = 'transparent';
//     });

//     uploadArea.addEventListener('drop', e => {
//         e.preventDefault();
//         uploadArea.style.borderColor = '#ddd';
//         uploadArea.style.backgroundColor = 'transparent';
//         if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
//     });
// }

// // Load all dashboard data
// async function loadDashboardData() {
//     try {
//         await Promise.all([
//             loadDashboardStats(),
//             loadDepartmentStats(),
//             loadUploadTrends(),
//             // loadDocuments()
//         ]);
//     } catch (error) {
//         console.error('Error loading dashboard data:', error);
//         showError('Failed to load dashboard data. Please check your connection.');
//     }
// }
// // Setup department stats filter
// function setupDepartmentStatsFilter() {
//     const periodFilter = document.querySelector('.department-stats-card .filter-select');
//     if (!periodFilter) return;

//     periodFilter.addEventListener('change', () => {
//         const selectedPeriod = periodFilter.value.toLowerCase();
//         loadDepartmentStats(selectedPeriod);
//     });
// }
// // Load dashboard stats
// async function loadDashboardStats() {
//     try {
//         const res = await fetchData(DASHBOARD_API_URL);
//         if (res.success && res.data) {
//             updateStatsCards(res.data.stats || {});
//             updateRecentActivity(res.data.recentActivity || []);
//             updateFileStatusTable(res.data.fileStatus || []);
//         } else {
//             console.error('Invalid dashboard stats response:', res);
//         }
//     } catch (error) {
//         console.error('Error loading dashboard stats:', error);
//     }
// }

// // Load department stats
// // Load department stats
// async function loadDepartmentStats(period = "monthly") {
//     try {
//         const res = await fetchData(`${DEPARTMENT_STATS_API_URL}?period=${period}`);
//         if (res.success && res.data) {
//             updateDepartmentChart(res.data);
//         }
//     } catch (error) {
//         console.error('Error loading department stats:', error);
//     }
// }


// // Load upload trends
// async function loadUploadTrends() {
//     try {
//         const docType = document.getElementById('docTypeFilter').value;
//         const timePeriod = document.getElementById('timeFilter').value;

//         const params = new URLSearchParams();
//         params.append("period", timePeriod);
//         if (docType) {
//             params.append("fileType", docType);
//         }

//         const res = await fetchData(`${UPLOADS_TRENDS_API_URL}?${params.toString()}`);
//         if (res.success && res.data) {
//             updateUploadTrendsChart(res.data);
//             updateUploadStats(res.data);
//         }
//     } catch (error) {
//         console.error('Error loading upload trends:', error);
//     }
// }

// function updateUploadStats(trendsData) {
//     // Add null checks for all elements
//     const pendingEl = document.getElementById('pendingCount');
//     const approvedEl = document.getElementById('approvedCount');
//     const rejectedEl = document.getElementById('rejectedCount');

//     if (pendingEl && approvedEl && rejectedEl) {
//         if (trendsData.period && trendsData.fileType) {
//             pendingEl.textContent = trendsData.pendingDocs || 0;
//             approvedEl.textContent = trendsData.approvedDocs || 0;
//             rejectedEl.textContent = trendsData.rejectedDocs || 0;
//         } else if (Array.isArray(trendsData)) {
//             calculateStatsFromDocuments();
//         }
//     }
// }
// async function calculateStatsFromDocuments() {
//     try {
//         const res = await fetchData(`${API_BASE_URL}/recent?limit=100`);
//         if (res.success && res.data) {
//             const docs = res.data.documents || [];
//             const pending = docs.filter(d => d.status === 'Pending').length;
//             const approved = docs.filter(d => d.status === 'Approved').length;
//             const rejected = docs.filter(d => d.status === 'Rejected').length;

//             document.getElementById('pendingCount').textContent = pending;
//             document.getElementById('approvedCount').textContent = approved;
//             document.getElementById('rejectedCount').textContent = rejected;
//         }
//     } catch (error) {
//         console.error('Error calculating stats from documents:', error);
//     }
// }


// // Update stats cards
// function updateStatsCards(stats = {}) {
//     // Safe defaults
//     const total = stats.total || 0;
//     const approved = stats.approved || 0;
//     const pending = stats.pending || 0;
//     const rejected = stats.rejected || 0;

//     // Update cards
//     document.getElementById('totalDocs').textContent = total;
//     document.getElementById('approvedDocs').textContent = approved;
//     document.getElementById('pendingDocs').textContent = pending;
//     document.getElementById('rejectedDocs').textContent = rejected;

//     // Update pending approvals text
//     const pendingText = document.getElementById('pendingApprovalsText');
//     if (pendingText) {
//         pendingText.textContent = `You have ${pending} Pending Approval${pending !== 1 ? 's' : ''}`;
//     }
// }

// // Update recent activity
// function updateRecentActivity(activities) {
//     const activityList = document.querySelector('.activity-list');
//     if (!activityList) return;

//     // Clear old activities
//     activityList.innerHTML = "";

//     if (activities.length === 0) {
//         activityList.innerHTML = '<li class="activity-item">No recent activity</li>';
//         return;
//     }

//     // Map and append up to 4 activities
//     activities.slice(0, 4).forEach(act => {
//         const li = document.createElement('li');
//         li.classList.add('activity-item');

//         const timestamp = act.timestamp ? new Date(act.timestamp).toLocaleString() : '';
//         const owner = act.performedBy || act.owner || 'Someone';
//         const docName = act.document || '';

//         li.innerHTML = `
//             <strong>${owner}</strong> ${act.action}
//             ${docName ? `on <em>${docName}</em>` : ''}
//             ${timestamp ? `at ${timestamp}` : ''}
//         `;

//         activityList.appendChild(li);
//     });
// }


// // Update file status table
// function updateFileStatusTable(files) {
//     console.log("Updating file status table with files:", files);
//     const tbody = document.getElementById("fileStatusTableBody");
//     if (!tbody) return;

//     // Clear old rows
//     tbody.innerHTML = "";

//     if (files.length === 0) {
//         tbody.innerHTML = `
//       <tr>
//         <td colspan="2" style="text-align: center;">No files found</td>
//       </tr>
//     `;
//         return;
//     }

//     const statusClasses = {
//         Pending: "status-pending",
//         Approved: "status-approved",
//         Rejected: "status-rejected"
//     };

//     files.slice(0, 4).forEach(file => {
//         const row = document.createElement("tr");
//         const statusClass = statusClasses[file.status] || "status-unknown";

//         row.innerHTML = `
//       <td>${file.filename || file.originalName || "Untitled"}</td>
//       <td><span class="status-badge ${statusClass}">
//         ${file.status || "Unknown"}
//       </span></td>
//     `;

//         tbody.appendChild(row);
//     });
// }


// // Initialize charts
// function setupCharts() {
//     // Department chart - will be updated with real data later
//     const deptCtx = document.getElementById('departmentChart');
//     if (deptCtx && deptCtx.getContext) {
//         window.departmentChartInstance = new Chart(deptCtx, {
//             type: 'doughnut',
//             data: {
//                 labels: ['Loading...'],
//                 datasets: [{
//                     data: [100],
//                     backgroundColor: ['#6B46C1']
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: { legend: { position: 'right' } }
//             }
//         });
//     }

//     // Uploads chart - will be updated with real data later
//     const uploadCtx = document.getElementById('uploadsChart');
//     if (uploadCtx && uploadCtx.getContext) {
//         window.uploadsChartInstance = new Chart(uploadCtx, {
//             type: 'bar',
//             data: {
//                 labels: ['Loading...'],
//                 datasets: [{
//                     label: 'Uploads',
//                     data: [0],
//                     backgroundColor: '#6B46C1'
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 scales: { y: { beginAtZero: true } }
//             }
//         });
//     }
// }

// // Custom fan animation for pie series
// function setupHighchartsAnimation() {
//     if (typeof Highcharts === 'undefined') {
//         console.warn('Highcharts not available yet, retrying...');
//         setTimeout(setupHighchartsAnimation, 100);
//         return;
//     }

//     (function (H) {
//         H.seriesTypes.pie.prototype.animate = function (init) {
//             const series = this,
//                 chart = series.chart,
//                 points = series.points,
//                 { animation } = series.options,
//                 { startAngleRad } = series;

//             function fanAnimate(point, startAngleRad) {
//                 const graphic = point.graphic,
//                     args = point.shapeArgs;

//                 if (graphic && args) {
//                     graphic
//                         .attr({ start: startAngleRad, end: startAngleRad, opacity: 1 })
//                         .animate({ start: args.start, end: args.end }, {
//                             duration: animation.duration / points.length
//                         }, function () {
//                             if (points[point.index + 1]) {
//                                 fanAnimate(points[point.index + 1], args.end);
//                             }
//                             if (point.index === series.points.length - 1) {
//                                 series.dataLabelsGroup.animate({ opacity: 1 }, void 0, function () {
//                                     points.forEach(p => { p.opacity = 1; });
//                                     series.update({ enableMouseTracking: true }, false);
//                                     chart.update({
//                                         plotOptions: {
//                                             pie: {
//                                                 innerSize: '40%',
//                                                 borderRadius: 8
//                                             }
//                                         }
//                                     });
//                                 });
//                             }
//                         });
//                 }
//             }

//             if (init) {
//                 points.forEach(point => { point.opacity = 0; });
//             } else {
//                 fanAnimate(points[0], startAngleRad);
//             }
//         };
//     }(Highcharts));
// }


// // Function to update the department chart using Highcharts
// function updateDepartmentChart(departmentData) {
//     const container = document.getElementById('departmentChart');
//     if (!container || !departmentData || !Array.isArray(departmentData)) return;

//     // Clear container
//     container.innerHTML = '';

//     // Process data for Highcharts
//     const seriesData = departmentData.map(item => ({
//         name: item.type || 'Unknown',
//         y: item.percentage || 0
//     }));

//     // Create Highcharts chart
//     Highcharts.chart(container, {
//         chart: { type: 'pie' },
//         title: { text: null }, // completely disables Highcharts title
//         credits: { enabled: false }, // remove "Highcharts.com" watermark if you don’t want it
//         tooltip: {
//             pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
//         },
//         plotOptions: {
//             pie: {
//                 allowPointSelect: true,
//                 cursor: 'pointer',
//                 dataLabels: {
//                     enabled: true,
//                     format: '<b>{point.name}</b>: {point.percentage:.1f} %'
//                 }
//             }
//         },
//         series: [{
//             name: 'Documents',
//             colorByPoint: true,
//             data: seriesData
//         }]
//     });
// }


// // Update upload trends chart
// function updateUploadTrendsChart(trendsData) {
//     const uploadCtx = document.getElementById('uploadsChart');
//     if (!uploadCtx || !trendsData) return;

//     if (window.uploadsChartInstance) {
//         window.uploadsChartInstance.destroy();
//     }

//     // Define colors for each status
//     const STATUS_COLORS = {
//         pending: '#FBBF24',   // Amber/Yellow
//         approved: '#34D399',  // Green
//         rejected: '#EF4444'   // Red
//     };

//     // Define bar style dimensions
//     const BAR_STYLE = {
//         width: 33,
//         opacity: 1
//     };

//     if (trendsData.period && trendsData.fileType) {
//         // Example: one bar per month split by status
//         const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

//         // Sample data: each month has {pending, approved, rejected} counts
//         const monthlyData = labels.map(() => ({
//             pending: Math.floor(Math.random() * 20),
//             approved: Math.floor(Math.random() * 20),
//             rejected: Math.floor(Math.random() * 20)
//         }));

//         const datasets = [
//             {
//                 label: 'Pending',
//                 data: monthlyData.map(m => m.pending),
//                 backgroundColor: `rgba(251,191,36,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             },
//             {
//                 label: 'Approved',
//                 data: monthlyData.map(m => m.approved),
//                 backgroundColor: `rgba(52,211,153,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             },
//             {
//                 label: 'Rejected',
//                 data: monthlyData.map(m => m.rejected),
//                 backgroundColor: `rgba(239,68,68,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             }
//         ];

//         window.uploadsChartInstance = new Chart(uploadCtx, {
//             type: 'bar',
//             data: { labels, datasets },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 scales: {
//                     y: { beginAtZero: true, stacked: true, grid: { display: true, drawBorder: false } },
//                     x: { stacked: true, grid: { display: false } }
//                 },
//                 plugins: { legend: { display: true } }
//             }
//         });

//     } else if (Array.isArray(trendsData)) {
//         // Document-type bars split by status
//         const labels = trendsData.map(item => item.type || 'Unknown');
//         const pendingData = trendsData.map(item => item.pending || 0);
//         const approvedData = trendsData.map(item => item.approved || 0);
//         const rejectedData = trendsData.map(item => item.rejected || 0);

//         const datasets = [
//             {
//                 label: 'Pending',
//                 data: pendingData,
//                 backgroundColor: `rgba(251,191,36,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             },
//             {
//                 label: 'Approved',
//                 data: approvedData,
//                 backgroundColor: `rgba(52,211,153,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             },
//             {
//                 label: 'Rejected',
//                 data: rejectedData,
//                 backgroundColor: `rgba(239,68,68,${BAR_STYLE.opacity})`,
//                 barThickness: BAR_STYLE.width,
//                 maxBarThickness: BAR_STYLE.width,
//                 borderRadius: BAR_STYLE.borderRadius
//             }
//         ];

//         window.uploadsChartInstance = new Chart(uploadCtx, {
//             type: 'bar',
//             data: { labels, datasets },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 scales: {
//                     y: {
//                         beginAtZero: true,
//                         stacked: true,
//                         max: 100,
//                         ticks: { callback: value => value + '%' },
//                         grid: { display: true, drawBorder: false }
//                     },
//                     x: { stacked: true, grid: { display: false } }
//                 },
//                 plugins: { legend: { display: true } }
//             }
//         });
//     }
// }

// // Add event listeners for filters
// function setupUploadFilters() {
//     const docTypeFilter = document.getElementById('docTypeFilter');
//     const timeFilter = document.getElementById('timeFilter');

//     if (docTypeFilter) {
//         docTypeFilter.addEventListener('change', loadUploadTrends);
//     }

//     if (timeFilter) {
//         timeFilter.addEventListener('change', loadUploadTrends);
//     }
// }


// // Perform search
// async function performSearch(query) {
//     try {
//         const res = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
//         if (res.success && res.data) {
//             updateDocumentsTable(res.data.documents || []);
//         }
//     } catch (error) {
//         console.error('Error searching documents:', error);
//         showError('Failed to search documents');
//     }
// }

// // Open add document modal
// function openAddDocumentModal() {
//     const modal = document.getElementById('addDocumentModal');
//     if (modal) {
//         modal.style.display = 'flex';
//     }

//     // Initialize Flatpickr here
//     flatpickr("#selectDate", {
//         dateFormat: "d-m-Y",
//         allowInput: true
//     });
// }


// // Close add document modal
// function closeAddDocumentModal() {
//     const modal = document.getElementById('addDocumentModal');
//     const form = document.getElementById('addDocumentForm');

//     if (modal) {
//         modal.style.display = 'none';
//     }

//     if (form) {
//         form.reset();
//         const filePreviews = document.getElementById('filePreviews');
//         if (filePreviews) {
//             filePreviews.innerHTML = '';
//         }
//         uploadedFiles = [];
//         delete form.dataset.editId;

//         const submitBtn = document.getElementById('submitDocumentBtn');
//         if (submitBtn) {
//             submitBtn.textContent = 'Add Document';
//         }
//     }
// }

// // Handle file uploads
// function handleFiles(files) {
//     Array.from(files).forEach(file => {
//         uploadedFiles.push(file);
//         addFilePreview(file);
//     });
// }

// // Add file preview
// function addFilePreview(file) {
//     const filePreviews = document.getElementById('filePreviews');
//     if (!filePreviews) return;

//     const fileSize = (file.size / 1024).toFixed(2) + ' KB';
//     const filePreview = document.createElement('div');
//     filePreview.className = 'file-preview';
//     filePreview.setAttribute('data-filename', file.name);
//     filePreview.innerHTML = `
//         <div class="file-info">
//             <i class="fas fa-file"></i>
//             <div>
//                 <div>${file.name}</div>
//                 <div>${fileSize}</div>
//             </div>
//         </div>
//         <div class="file-progress">
//             <div class="file-progress-bar"></div>
//         </div>
//         <div class="file-remove">
//             <i class="fas fa-times"></i>
//         </div>
//     `;
//     filePreviews.appendChild(filePreview);

//     filePreview.querySelector('.file-remove').addEventListener('click', () => {
//         uploadedFiles = uploadedFiles.filter(f => f.name !== file.name);
//         filePreview.remove();
//     });

//     let progress = 0;
//     const interval = setInterval(() => {
//         progress += 5;
//         const progressBar = filePreview.querySelector('.file-progress-bar');
//         if (progressBar) {
//             progressBar.style.width = `${progress}%`;
//         }
//         if (progress >= 100) clearInterval(interval);
//     }, 100);
// }
// const projectSelect = document.getElementById("projectName");
// projectSelect.addEventListener("change", async function () {
//     const projectId = this.value;
//     const managerSelect = document.getElementById("projectManager");

//     if (!projectId) {
//         // Show a placeholder option when no project is selected
//         SearchableDropdown.updateOptions(managerSelect, [{ value: '', label: 'Select project first' }]);
//         return;
//     }

//     try {
//         const response = await fetch(`${BASE_URL}/projects/all-managers/${projectId}`, {
//             method: "GET",
//             credentials: "include"
//         });

//         if (!response.ok) throw new Error("Failed to fetch managers");

//         const result = await response.json();
//         const managers = result.managers || [];

//         // Only add real managers, no default 'Select'
//         const options = managers.map(m => ({ value: m._id, label: m.name }));

//         SearchableDropdown.updateOptions(managerSelect, options);

//     } catch (error) {
//         console.error("Error loading managers:", error);
//         SearchableDropdown.updateOptions(managerSelect, [{ value: '', label: 'Failed to load' }]);
//     }
// });



// // Submit document form
// async function submitDocumentForm() {
//     const form = document.getElementById("addDocumentForm");
//     if (!form) return;

//     const formData = new FormData();

//     // Match fields with correct IDs from your HTML
//     formData.append("title", document.getElementById("projectName").value); // or a separate "name" field if required
//     formData.append("description", document.getElementById("description").value);
//     formData.append("department", document.getElementById("department").value);
//     formData.append("tags", document.getElementById("addTags").value);
//     formData.append("category", document.getElementById("metadata").value || "general");
//     formData.append("compliance", document.querySelector("input[name='compliance']:checked").value);
//     formData.append("project", document.getElementById("projectName").value);
//     formData.append("documentManager", document.getElementById("projectManager").value);
//     formData.append("comment", document.getElementById("comment").value);
//     formData.append("links", document.getElementById("addLink").value);
//     console.log("Form Data before files:", Array.from(formData.entries()));
//     // Only send expiryDate if compliance = yes
//     const compliance = document.querySelector("input[name='compliance']:checked").value;
//     if (compliance === "yes") {
//         const expiryDate = document.getElementById("expiryDate").value;
//         if (expiryDate) formData.append("expiryDate", expiryDate);
//     }

//     // Attach all uploaded files
//     uploadedFiles.forEach(file => formData.append("files", file));

//     try {
//         const response = await fetch(`${BASE_URL}/documents`, {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${localStorage.getItem("token")}`
//             },
//             body: formData
//         });

//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(errorText || "Failed to save document");
//         }

//         const result = await response.json();
//         showSuccess("Document created successfully");
//         console.log("Document saved:", result);

//         closeAddDocumentModal();
//         loadDashboardData();

//     } catch (error) {
//         console.error("Error saving document:", error);
//         showError(error.message);
//     }
// }


// // Check screen size for responsive design
// function checkScreenSize() {
//     const menuToggle = document.querySelector('.menu-toggle');
//     const sidebar = document.querySelector('.sidebar');

//     if (menuToggle && sidebar) {
//         if (window.innerWidth <= 768) {
//             menuToggle.style.display = 'block';
//             sidebar.classList.remove('open');
//         } else {
//             menuToggle.style.display = 'none';
//             sidebar.classList.remove('open');
//         }
//     }
// }

// // Listen for resize events
// window.addEventListener('resize', checkScreenSize);

// // Success Notification
// function showSuccess(message) {
//     // Create a simple notification if Toastify is not available
//     const notification = document.createElement('div');
//     notification.style.cssText = `
//         position: fixed;
//         top: 20px;
//         right: 20px;
//         background: linear-gradient(to right, #00b09b, #96c93d);
//         color: white;
//         padding: 15px 20px;
//         border-radius: 5px;
//         z-index: 10000;
//         box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//     `;
//     notification.textContent = message;
//     document.body.appendChild(notification);

//     setTimeout(() => {
//         document.body.removeChild(notification);
//     }, 4000);

//     console.log(`[SUCCESS]: ${message}`);
// }

// // Error Notification
// function showError(message) {
//     // Create a simple notification if Toastify is not available
//     const notification = document.createElement('div');
//     notification.style.cssText = `
//         position: fixed;
//         top: 20px;
//         right: 20px;
//         background: linear-gradient(to right, #ff5f6d, #ffc371);
//         color: white;
//         padding: 15px 20px;
//         border-radius: 5px;
//         z-index: 10000;
//         box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//     `;
//     notification.textContent = message;
//     document.body.appendChild(notification);

//     setTimeout(() => {
//         document.body.removeChild(notification);
//     }, 5000);

//     console.error(`[ERROR]: ${message}`);
// }

// API endpoints (loaded from environment or config in production)
const API_BASE_URL = window.env?.API_BASE_URL || '/api/documents';
const DASHBOARD_API_URL = window.env?.DASHBOARD_API_URL || '/api/dashboard';
const DEPARTMENT_STATS_API_URL = window.env?.DEPARTMENT_STATS_API_URL || '/api/dashboard/department-document-uploads';
const UPLOADS_TRENDS_API_URL = window.env?.UPLOADS_TRENDS_API_URL || '/api/dashboard/department-documents';

// Store uploaded files
let uploadedFiles = [];
let recentDocsState = {
    page: 1,
    limit: 10,
    departmentId: '',
    sortBy: 'docType'
};

// Initialize dashboard on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Main dashboard initialization
function initDashboard() {
    setupSidebar();
    setupSearch();
    setupModal();
    setupUploadFilters();
    setupDepartmentStatsFilter();
    // setupRecentActivityFilters();
    setupCharts();
    checkScreenSize();
    loadDashboardData();
}

// Setup sidebar toggle and submenu functionality
function setupSidebar() {
    const menuItems = document.querySelectorAll('.menu-item.with-submenu');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const submenu = item.nextElementSibling;
            const arrow = item.querySelector('.menu-arrow i');
            if (submenu && arrow) {
                submenu.classList.toggle('open');
                arrow.style.transform = submenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
}

// Setup search functionality
function setupSearch() {
    const searchButton = document.querySelector('.search-bar button');
    const searchInput = document.querySelector('.search-bar input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => performSearch(searchInput.value));
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') performSearch(searchInput.value);
        });
    }
}

// Setup modal functionality
function setupModal() {
    const modal = document.getElementById('add_project');
    const addDocumentBtn = document.querySelector('.btn[data-bs-target="#add_project"]');
    const closeModalBtn = modal?.querySelector('.btn-close');
    const cancelModalBtn = modal?.querySelector('.btn-cancel');
    const submitDocumentBtn = modal?.querySelector('.btn-primary');

    if (addDocumentBtn) addDocumentBtn.addEventListener('click', openAddDocumentModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeAddDocumentModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeAddDocumentModal);
    if (submitDocumentBtn) submitDocumentBtn.addEventListener('click', submitDocumentForm);

    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeAddDocumentModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAddDocumentModal();
    });

    setupFileUpload();
}

// Setup file upload area
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    uploadArea.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = e => handleFiles(e.target.files);
        input.click();
    });

    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#6B46C1';
        uploadArea.style.backgroundColor = '#f0f0f0';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = 'transparent';
    });

    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.backgroundColor = 'transparent';
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadDashboardStats(),
            loadDepartmentStats(),
            loadUploadTrends(),
            loadRecentDocuments()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please check your connection.');
    }
}

// Setup department stats filter
function setupDepartmentStatsFilter() {
    const periodLinks = document.querySelectorAll('.dropdown-menu a');
    periodLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedPeriod = e.target.textContent.toLowerCase();
            loadDepartmentStats(selectedPeriod);
        });
    });
}

// Setup recent activity filters
function setupRecentActivityFilters() {
    const departmentLinks = document.querySelectorAll('.dropdown-menu a');
    const sortByFilter = document.querySelector('.form-select');

    departmentLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            recentDocsState.departmentId = e.target.textContent !== 'Select Department' ? e.target.textContent : '';
            loadRecentDocuments();
        });
    });

    if (sortByFilter) {
        sortByFilter.addEventListener('change', (e) => {
            recentDocsState.sortBy = e.target.value.toLowerCase();
            loadRecentDocuments();
        });
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const res = await fetchData(DASHBOARD_API_URL);
        if (res.success && res.data) {
            updateStatsCards(res.data.stats || {});
            updateRecentActivity(res.data.recentActivity || []);
            updateFileStatusTable(res.data.fileStatus || []);
        } else {
            console.error('Invalid dashboard stats response:', res);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load department stats
async function loadDepartmentStats(period = 'monthly') {
    try {
        const res = await fetchData(`${DEPARTMENT_STATS_API_URL}?period=${period}`);
        if (res.success && res.data) {
            updateDepartmentChart(res.data);
        }
    } catch (error) {
        console.error('Error loading department stats:', error);
    }
}

// Load upload trends
async function loadUploadTrends() {
    try {
        const departmentDropdown = document.querySelector('.dropdown-toggle');
        const timeDropdown = document.querySelector('.btn-white.border');
        const department = departmentDropdown?.textContent !== 'All Departments' ? departmentDropdown.textContent : '';
        const timePeriod = timeDropdown?.textContent.trim().toLowerCase() || 'monthly';

        const params = new URLSearchParams();
        params.append('period', timePeriod);
        if (department) params.append('department', department);

        const res = await fetchData(`${UPLOADS_TRENDS_API_URL}?${params.toString()}`);
        if (res.success && res.data) {
            updateUploadTrendsChart(res.data);
        }
    } catch (error) {
        console.error('Error loading upload trends:', error);
    }
}

// Load recent documents
async function loadRecentDocuments() {
    try {
        const params = new URLSearchParams();
        params.append('page', recentDocsState.page);
        params.append('limit', recentDocsState.limit);
        if (recentDocsState.departmentId) params.append('department', recentDocsState.departmentId);
        if (recentDocsState.sortBy) params.append('sortBy', recentDocsState.sortBy);

        const res = await fetchData(`${API_BASE_URL}/recent?${params.toString()}`);
        if (res.success && res.data) {
            updateDocumentsTable(res.data.documents || []);
        }
    } catch (error) {
        console.error('Error loading recent documents:', error);
    }
}

// Update stats cards
function updateStatsCards(stats = {}) {
    const totalDocs = document.querySelector('.card-body h3.fs-32');
    const approvedDocs = document.querySelectorAll('.card-body h3.fs-32')[1];
    const pendingDocs = document.querySelectorAll('.card-body h3.fs-32')[2];
    const rejectedDocs = document.querySelectorAll('.card-body h3.fs-32')[3];
    const pendingText = document.querySelector('.text-primary.text-decoration-underline');

    if (totalDocs) totalDocs.textContent = stats.total || 160;
    if (approvedDocs) approvedDocs.textContent = stats.approved || 70;
    if (pendingDocs) pendingDocs.textContent = stats.pending || 50;
    if (rejectedDocs) rejectedDocs.textContent = stats.rejected || 40;
    if (pendingText) pendingText.textContent = stats.pending || 21;
}

// recent activity
function updateRecentActivity(activities) {
    const activityList = document.querySelector('.card-body.activity-list');
    if (!activityList) return;

    activityList.innerHTML = '';

    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="dflexbtwn mb-2">
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    activities.slice(0, 4).forEach(act => {
        const div = document.createElement('div');
        div.classList.add('dflexbtwn', 'mb-2');

        div.innerHTML = `
    <div class="flxtblleft">
        <span class="mb-2">
            <img src="/img/icons/usrround.png">
        </span>
        <div class="flxtbltxt ms-3">
            <p class="fs-16 mb-1 fw-normal">
                ${act.performedBy || 'Someone'} ${act.action || ''} the document 
                ${act.fileDetails && act.fileDetails.length > 0 ? act.fileDetails[0].filename : (act.document || '')} 
                in ${act.departmentName || 'Unknown Department'}
            </p>
        </div>
    </div>
`;
        activityList.appendChild(div);
    });
}

// Update file status table
function updateFileStatusTable(files) {
    const tbody = document.querySelector('.flextable .flxtblbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!files || files.length === 0) {
        tbody.innerHTML = '<div class="dflexbtwn mb-2"><p>No files found</p></div>';
        return;
    }

    files.slice(0, 4).forEach((file, index) => {
        const div = document.createElement('div');
        div.classList.add('dflexbtwn', 'mb-2');

        const filename = file.filename || 'Untitled';
        const filesize = file.size || '190KB';
        const status = file.status || 'Unknown';
        const iconNumber = index + 1; // icons 1-4

        div.innerHTML = `
            <div class="flxtblleft">
                <span class="avatar rounded bg-light mb-2">
                    <img src="/img/icons/fn${iconNumber}.png">
                </span>
                <div class="flxtbltxt">
                    <p class="fs-14 mb-1 fw-normal">${filename}</p>
                    <span class="fs-11 fw-light text-black">${filesize}</span>
                </div>
            </div>
            <div class="flxtblright">
                <p class="fs-12 fw-light text-black">${status}</p>
            </div>
        `;
        tbody.appendChild(div);
    });
}


// recent documents table
function updateDocumentsTable(documents) {
    const tbody = document.querySelector('.recent-documents tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13">No documents found</td></tr>';
        return;
    }

    const statusClasses = {
        Approved: 'bg-soft-success',
        Pending: 'bg-soft-warning',
        Rejected: 'bg-soft-danger',
        Draft: 'bg-soft-info'
    };

    documents.forEach(doc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="btn-group" role="group">
                    <button type="button" class="btn border-0" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ti ti-settings"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#">View</a></li>
                        <li><a class="dropdown-item" href="#">Edit</a></li>
                    </ul>
                </div>
            </td>
            <td>
                <div class="flxtblleft">
                    <span class="avatar rounded bg-light mb-2">
                        <img src="/img/icons/fn${Math.floor(Math.random() * 4) + 1}.png">
                    </span>
                    <div class="flxtbltxt">
                        <p class="fs-14 mb-1 fw-normal">${doc.fileName || 'Untitled'}</p>
                        <span class="fs-11 fw-light text-black">${doc.fileType || ''}</span>
                    </div>
                </div>
            </td>
            <td><p class="tbl_date">${new Date(doc.lastModifiedOn).toLocaleString()}</p></td>
            <td><p>${doc.owner || '-'}</p></td>
            <td><p>${doc.department || '-'}</p></td>
            <td><p>${doc.project || '-'}</p></td>
            <td><p>${doc.sharedWith && doc.sharedWith.length ? doc.sharedWith.join(', ') : '-'}</p></td>
            <td><p>${doc.tags && doc.tags.length ? doc.tags.join(', ') : '-'}</p></td>
            <td><p>${doc.metadata && Object.keys(doc.metadata).length ? JSON.stringify(doc.metadata) : '-'}</p></td>
            <td><p class="tbl_date">${new Date(doc.createdOn).toLocaleString()}</p></td>
            <td><p>${doc.description || '-'}</p></td>
            <td><p>${doc.remark || '-'}</p></td>
            <td><span class="badge badge-md ${statusClasses[doc.status] || 'bg-soft-info'}">${doc.status || 'Draft'}</span></td>
        `;
        tbody.appendChild(row);
    });
}


// Initialize charts
function setupCharts() {
    // const ctx = document.getElementById('department');
    // if (!ctx) return;

    // if (window.departmentChartInstance) {
    //     window.departmentChartInstance.destroy();
    // }

    // window.departmentChartInstance = new Chart(ctx, {
    //     type: 'doughnut',
    //     data: {
    //         labels: [], // empty initially
    //         datasets: [{
    //             data: [],
    //             backgroundColor: ['#6B46C1', '#34D399', '#FBBF24'],
    //             borderWidth: 0
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         cutout: '70%',
    //         plugins: {
    //             legend: { display: false },
    //             tooltip: {
    //                 callbacks: {
    //                     label: function (context) {
    //                         return `${context.label}: ${context.parsed}%`;
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // });
}

// department chart
function updateDepartmentChart(departmentData) {
    if (!window.departmentChartInstance || !Array.isArray(departmentData) || departmentData.length === 0) {
        return;
    }

    // Extract labels & data
    const labels = departmentData.map(item => item.type || 'Unknown');
    const data = departmentData.map(item => item.percentage || 0);

    // Update chart data
    window.departmentChartInstance.data.labels = labels;
    window.departmentChartInstance.data.datasets[0].data = data;
    window.departmentChartInstance.update();

    // Find top department
    const maxIndex = data.indexOf(Math.max(...data));
    const topDept = labels[maxIndex] || 'N/A';
    const topValue = data[maxIndex] || 0;

    // Update center text
    const deptTitleEl = document.querySelector('.attendance-canvas p');
    const deptValueEl = document.getElementById('dept-percentage');

    if (deptTitleEl) deptTitleEl.textContent = topDept;
    if (deptValueEl) deptValueEl.textContent = topValue + '%';
}


// Update upload trends chart
function updateUploadTrendsChart(trendsData) {
    if (!window.salesChartInstance || !trendsData) return;

    const labels = trendsData.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const datasets = [
        {
            label: 'Pending Approvals',
            data: trendsData.pending || [10, 15, 8, 12, 20, 18],
            backgroundColor: '#60A5FA',
            barThickness: 20
        },
        {
            label: 'Approved',
            data: trendsData.approved || [25, 30, 22, 28, 35, 32],
            backgroundColor: '#34D399',
            barThickness: 20
        },
        {
            label: 'Rejected',
            data: trendsData.rejected || [5, 8, 6, 10, 12, 9],
            backgroundColor: '#F87171',
            barThickness: 20
        }
    ];

    window.salesChartInstance.data.labels = labels;
    window.salesChartInstance.data.datasets = datasets;
    window.salesChartInstance.update();
}

// Add event listeners for filters
function setupUploadFilters() {
    const departmentLinks = document.querySelectorAll('.dropdown-menu a');
    departmentLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadUploadTrends();
        });
    });

    const timeLinks = document.querySelectorAll('.dropdown-menu a');
    timeLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadUploadTrends();
        });
    });
}

// Perform search
async function performSearch(query) {
    try {
        const res = await fetchData(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        if (res.success && res.data) {
            updateDocumentsTable(res.data.documents || []);
        }
    } catch (error) {
        console.error('Error searching documents:', error);
        showError('Failed to search documents');
    }
}

// Open add document modal
function openAddDocumentModal() {
    const modal = document.getElementById('add_project');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
    }
}

// Close add document modal
function closeAddDocumentModal() {
    const modal = document.getElementById('add_project');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// Handle file uploads
function handleFiles(files) {
    Array.from(files).forEach(file => {
        uploadedFiles.push(file);
        addFilePreview(file);
    });
}

// Add file preview
function addFilePreview(file) {
    const filePreviews = document.getElementById('filePreviews');
    if (!filePreviews) return;

    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    const filePreview = document.createElement('div');
    filePreview.className = 'file-preview';
    filePreview.setAttribute('data-filename', file.name);
    filePreview.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file"></i>
            <div>
                <div>${file.name}</div>
                <div>${fileSize}</div>
            </div>
        </div>
        <div class="file-progress">
            <div class="file-progress-bar"></div>
        </div>
        <div class="file-remove">
            <i class="fas fa-times"></i>
        </div>
    `;
    filePreviews.appendChild(filePreview);

    filePreview.querySelector('.file-remove').addEventListener('click', () => {
        uploadedFiles = uploadedFiles.filter(f => f.name !== file.name);
        filePreview.remove();
    });

    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        const progressBar = filePreview.querySelector('.file-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progress >= 100) clearInterval(interval);
    }, 100);
}

// Submit document form
async function submitDocumentForm() {
    const form = document.querySelector('#add_project form');
    if (!form) return;

    const formData = new FormData();
    formData.append('title', document.getElementById('projectName')?.value || '');
    formData.append('description', document.getElementById('description')?.value || '');
    formData.append('department', document.getElementById('department')?.value || '');
    formData.append('tags', document.getElementById('addTags')?.value || '');
    formData.append('metadata', document.getElementById('metadata')?.value || 'general');
    uploadedFiles.forEach(file => formData.append('files', file));

    try {
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Failed to save document');

        showSuccess('Document created successfully');
        closeAddDocumentModal();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving document:', error);
        showError('Failed to save document');
    }
}

// Check screen size for responsive design
function checkScreenSize() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        if (window.innerWidth <= 768) {
            menuToggle.style.display = 'block';
            sidebar.classList.remove('open');
        } else {
            menuToggle.style.display = 'none';
            sidebar.classList.add('open');
        }
    }
}

// Listen for resize events
window.addEventListener('resize', checkScreenSize);

// Success Notification
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(to right, #00b09b, #96c93d);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 4000);
}

// Error Notification
function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(to right, #ff5f6d, #ffc371);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

// Utility function to fetch data
async function fetchData(url) {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    return response.json();
}