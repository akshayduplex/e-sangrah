// // Global state
// window.selectedFolders = [];   // [{ id, name }]
// window.selectedProject = { id: null, name: null };
// window.selectedDepartment = { id: null, name: null };
// window.selectedProjectManager = { id: null, name: null };

// const folderForm = document.getElementById('folderForm');
// const folderContainer = document.getElementById('folderContainer');
// const selectedFolderInput = document.getElementById('selectedFolderId');

// function debounce(fn, delay) {
//     let timer;
//     return function (...args) {
//         clearTimeout(timer);
//         timer = setTimeout(() => fn.apply(this, args), delay);
//     };
// }

// $(document).ready(function () {
//     // --------------------------
//     // Summernote
//     // --------------------------
//     $('.summernote').summernote({
//         height: 200,
//         callbacks: {
//             onChange: function (contents) {
//                 $('#summernote').val(contents);
//             }
//         }
//     });

//     // --------------------------
//     // Select2
//     // --------------------------
//     $('.select2').select2();

//     // --------------------------
//     // Datepicker
//     // --------------------------
//     $('.datetimepicker').datetimepicker({
//         format: 'DD-MM-YYYY',
//         useCurrent: false
//     });

//     // --------------------------
//     // Compliance radio buttons
//     // --------------------------
//     $('input[name="compliance"]').change(function () {
//         if ($(this).val() === 'yes') {
//             $('#expiryDateContainer').show();
//             $('input[name="expiryDate"]').prop('required', true);
//         } else {
//             $('#expiryDateContainer').hide();
//             $('input[name="expiryDate"]').prop('required', false);
//         }
//     });

//     // --------------------------
//     // Metadata modal
//     // --------------------------
//     $('#metadataForm').on('submit', function (e) {
//         e.preventDefault();
//         const formData = $(this).serializeArray();
//         const metadata = {};
//         formData.forEach(item => metadata[item.name] = item.value);

//         $('#metadataInput').val(JSON.stringify(metadata));
//         $('#metadataDisplay').val(metadata.fileName + ' - ' + metadata.fileDescription);
//         $('#metadata-modal').modal('hide');
//     });

//     function toggleCreateFolderBtn() {
//         const projectSelected = !!$('#projectName').val() && $('#projectName').val() !== 'all';

//         // Enable/disable Create Folder button
//         $('#createFolderBtn').prop('disabled', !projectSelected);

//         // Enable/disable Upload Box
//         if (projectSelected) {
//             $('#uploadBox').css({ 'pointer-events': '', 'opacity': '' });
//         } else {
//             $('#uploadBox').css({ 'pointer-events': 'none', 'opacity': 0.6 });
//         }
//     }

//     async function loadFolders(rootId = null, parentPath = []) {
//         const departmentId = $('#department').val();
//         const projectId = $('#projectName').val();

//         // Reset if nothing selected
//         if ((!projectId || projectId === 'all') && (!departmentId || departmentId === 'all')) {
//             $('#folderContainer').empty();
//             window.selectedFolders = [];
//             $('#selectedFolderId').val('');
//             updateDirectoryPath();
//             return;
//         }

//         const query = new URLSearchParams();
//         if (departmentId && departmentId !== 'all') query.append('departmentId', departmentId);
//         if (projectId && projectId !== 'all') query.append('projectId', projectId);
//         if (rootId) query.append('rootId', rootId);

//         try {
//             const res = await fetch(`/api/folders/tree/structure?${query.toString()}`);
//             const data = await res.json();
//             if (!data.success) return;

//             const folders = data.tree || [];
//             const container = $('#folderContainer').empty(); // Clear old children

//             folders.forEach((folder, index) => {
//                 const subCount = folder.children?.length || 0;
//                 const folderCard = $(`
//                 <div class="folder-card" style="width:80px;">
//                     <div class="fldricon"><img src="/img/icons/folder.png"></div>
//                     <div class="fldrname text-truncate">${folder.name}</div>
//                     ${subCount ? `<span class="badge">${subCount}</span>` : ''}
//                 </div>
//             `);

//                 folderCard.data('folder', folder);

//                 // Single click: select folder
//                 folderCard.on('click', function () {
//                     $('.folder-card').removeClass('active border-primary').addClass('border');
//                     folderCard.addClass('active border-primary');

//                     // Replace selectedFolders with new path up to this folder
//                     window.selectedFolders = [...parentPath, { id: folder._id, name: folder.name }];
//                     $('#selectedFolderId').val(folder._id);
//                     updateDirectoryPath();
//                 });

//                 // Double click: open folder
//                 if (subCount > 0) {
//                     folderCard.on('dblclick', async function () {
//                         const newPath = [...parentPath, { id: folder._id, name: folder.name }];
//                         await loadFolders(folder._id, newPath); // pass new path
//                     });
//                 }

//                 container.append(folderCard);

//                 // Auto-select first folder at root
//                 if (index === 0 && !rootId) folderCard.trigger('click');
//             });

//             updateDirectoryPath();
//         } catch (err) {
//             logger.error("Error loading folders:", err);
//         }
//     }



//     $('#folder-modal').on('show.bs.modal', function () {
//         const projectText = $('#projectName option:selected').text();
//         const projectId = $('#projectName').val();
//         const departmentText = $('#department option:selected').text();
//         const departmentId = $('#department').val();
//         const folders = window.selectedFolders || [];

//         const parentFolderSelect = $('#parentFolder');
//         parentFolderSelect.empty();

//         // ---------------------------
//         // 1. Top-Level (no parent)
//         // ---------------------------
//         parentFolderSelect.append(
//             new Option('-- Top-Level (No Parent) --', '', false, false)
//         );

//         // ---------------------------
//         // 2. Project / Department
//         // ---------------------------
//         if (projectId && projectId !== 'all' && departmentId && departmentId !== 'all') {
//             const isSelected = folders.length === 0; // select if no folder selected
//             parentFolderSelect.append(
//                 new Option(`${projectText} / ${departmentText}`, 'root', false, isSelected)
//             );
//         }

//         // ---------------------------
//         // 3. Existing folder chain
//         // ---------------------------
//         folders.forEach((f, i) => {
//             const fullPath = `${projectText} / ${departmentText} /${folders.slice(0, i + 1).map(ff => ff.name).join(' / ')}`;
//             const isSelected = i === folders.length - 1; // last folder selected by default
//             parentFolderSelect.append(new Option(fullPath, f.id, false, isSelected));
//         });

//         // Trigger change for select2
//         parentFolderSelect.trigger('change');
//     });




//     // Run on page load
//     toggleCreateFolderBtn();
//     loadFolders();           // <-- load folders initially
//     updateDirectoryPath();   // <-- update breadcrumb
//     // --------------------------
//     // Handle folder creation
//     $('#createFolderForm').on('submit', async function (e) {
//         e.preventDefault();

//         const folderName = $('#folderName').val().trim();
//         const projectId = $('#projectName').val();
//         const departmentId = $('#department').val();
//         // const parentId = $('#selectedFolderId').val() || null;
//         let parentId = $('#parentFolder').val();

//         // If the user selected "Root" or no parent, set null for top-level
//         if (!parentId || parentId === '') {
//             parentId = null;
//         }
//         else if (parentId === 'root') parentId = null;
//         // Validation
//         if (!folderName || !projectId || !departmentId) {
//             showToast('Please select Project, Department, and provide folder name.', 'error');
//             return;
//         }


//         try {
//             const response = await fetch('/api/folders', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ name: folderName, parentId, projectId, departmentId })
//             });

//             const data = await response.json();
//             if (!data.success) throw new Error(data.message || 'Could not create folder');

//             $('#folder-modal').modal('hide');
//             $('#createFolderForm')[0].reset();

//             // Reload current folder to show new folder at the end
//             // Determine new path to reload the parent folder
//             let newPath = [];

//             if (parentId) {
//                 // If creating inside a subfolder, find the path to parent
//                 const parentIndex = window.selectedFolders.findIndex(f => f.id === parentId);
//                 if (parentIndex >= 0) {
//                     newPath = window.selectedFolders.slice(0, parentIndex + 1);
//                 } else {
//                     // If parent is selected from modal but not in selectedFolders
//                     newPath = [...window.selectedFolders];
//                     const parentName = $('#parentFolder option:selected').text();
//                     if (parentName) {
//                         newPath.push({ id: parentId, name: parentName });
//                     }
//                 }
//             }

//             // Reload the parent folder and auto-select it
//             await loadFolders(parentId, newPath);
//             // Inside the success block, after loadFolders
//             const container = $('#folderContainer');
//             const newFolderCard = container.find('.folder-card').filter(function () {
//                 return $(this).find('.fldrname').text() === folderName;
//             }).first();

//             if (newFolderCard.length) {
//                 newFolderCard.trigger('click');
//             }

//             // Update selected folder to parent folder
//             window.selectedFolders = newPath;
//             $('#selectedFolderId').val(parentId);
//             updateDirectoryPath();


//             showToast('Folder created successfully!', 'success');
//         } catch (err) {
//             showToast(err.message || 'Something went wrong while creating the folder.', 'error');
//         }
//     });

//     const uploadBox = document.getElementById("uploadBox");
//     const fileInput = document.getElementById("fileInput");
//     const fileList = document.getElementById("fileList");
//     let uploadedFileIds = []; // store server-side file IDs

//     // Modal elements
//     const trashModal = new bootstrap.Modal(document.getElementById("trashdoc-modal"));
//     const trashModalTitle = document.querySelector("#trashdocLabel");
//     const trashModalBody = document.querySelector("#trashdoc-modal .modal-body");
//     const confirmTrashBtn = document.getElementById("confirm-trash-folder");

//     let fileToDelete = null; // store fileItem being deleted

//     // Click to open file dialog
//     uploadBox.addEventListener("click", () => fileInput.click());

//     // File input change
//     fileInput.addEventListener("change", async (e) => {
//         await handleFileUpload(e.target.files);
//     });

//     // Drag & drop
//     uploadBox.addEventListener("dragover", e => {
//         e.preventDefault();
//         uploadBox.classList.add("dragover");
//     });
//     uploadBox.addEventListener("dragleave", () => uploadBox.classList.remove("dragover"));
//     uploadBox.addEventListener("drop", async e => {
//         e.preventDefault();
//         await handleFileUpload(e.dataTransfer.files);
//     });

//     // Handle file uploads
//     async function handleFileUpload(files) {
//         const folderId = document.getElementById('selectedFolderId').value;
//         if (!folderId) return showToast("Please select a folder.", 'info');

//         for (const file of files) {
//             const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 8);

//             const fileItem = document.createElement("div");
//             fileItem.className = "file-item col-sm-5 mb-3 p-3 border rounded";
//             fileItem.setAttribute("data-file-id", tempId);

//             fileItem.innerHTML = `
//             <div class="file-info d-flex align-items-center">
//                 <i class="fa-solid fa-file fa-2x me-3"></i>
//                 <div class="flex-grow-1">
//                     <h6 class="mb-0 text-truncate">${file.name}</h6>
//                     <small class="text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB</small>
//                 </div>
//             </div>
//             <div class="file-progress mt-2">
//                 <div class="progress">
//                     <div class="progress-bar bg-success" role="progressbar" style="width:0%">0%</div>
//                 </div>
//             </div>
//             <button class="remove-btn btn btn-sm btn-danger mt-2" data-file-id="${tempId}" disabled>
//                 <i class="fa-solid fa-xmark"></i> Remove
//             </button>
//         `;
//             fileList.appendChild(fileItem);

//             const progressBar = fileItem.querySelector(".progress-bar");
//             const removeBtn = fileItem.querySelector(".remove-btn");

//             try {
//                 const formData = new FormData();
//                 formData.append('file', file);

//                 const res = await fetch(`/api/files/upload/${folderId}`, { method: 'POST', body: formData });
//                 const data = await res.json();

//                 if (!data.success) throw new Error(data.message || "Upload failed");

//                 const uploadedFile = data.files[0];
//                 const fileId = uploadedFile.fileId;

//                 uploadedFileIds.push(fileId);
//                 fileItem.setAttribute("data-file-id", fileId);
//                 removeBtn.setAttribute("data-file-id", fileId);
//                 removeBtn.disabled = false;

//                 progressBar.style.width = "100%";
//                 progressBar.textContent = "Uploaded";

//             } catch (err) {
//                 progressBar.classList.remove("bg-success");
//                 progressBar.classList.add("bg-danger");
//                 progressBar.textContent = "Error";
//                 console.error("Upload failed:", err);
//             }
//         }
//     }

//     // Remove file handler using modal
//     fileList.addEventListener("click", function (e) {
//         const btn = e.target.closest(".remove-btn");
//         if (!btn) return;

//         fileToDelete = btn.closest(".file-item");
//         const fileId = btn.getAttribute("data-file-id");
//         if (!fileToDelete || !fileId) return;

//         // Update modal content
//         trashModalTitle.innerHTML = `
//         <img src="/img/icons/bin.png" class="me-2" style="width:24px; height:24px;">
//         Delete File
//     `;
//         trashModalBody.innerHTML = `
//         You are about to delete <strong>"${fileToDelete.querySelector("h6").textContent}"</strong>.<br>
//         This action cannot be undone. Are you sure you want to proceed?
//     `;

//         trashModal.show();
//     });


//     // Confirm deletion
//     confirmTrashBtn.addEventListener("click", async () => {
//         if (!fileToDelete) return;

//         const fileId = fileToDelete.getAttribute("data-file-id");

//         try {
//             if (uploadedFileIds.includes(fileId)) {
//                 const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
//                 const data = await res.json();
//                 if (!data.success) throw new Error(data.message || "Delete failed");
//                 uploadedFileIds = uploadedFileIds.filter(id => id !== fileId);
//             }

//             fileToDelete.remove();
//             fileToDelete = null;
//             trashModal.hide();
//             showToast("File removed successfully!", 'success');

//         } catch (err) {
//             showToast("Error deleting file: " + err.message, 'error');
//             trashModal.hide();
//         }
//     });



//     $('#parentFolder').select2({
//         dropdownParent: $('#folder-modal'), // ensures it stays inside modal
//         width: '100%',
//         placeholder: "-- Root (No Parent) --",
//         allowClear: true
//     });

//     // --------------------------
//     // Project Name Select2
//     // --------------------------
//     $("#projectName").select2({
//         placeholder: "-- Select Project Name --",
//         allowClear: false,
//         ajax: {
//             delay: 300,
//             transport: function (params, success, failure) {
//                 const search = params.data.term || "";
//                 $.ajax({
//                     url: `/api/projects?search=${encodeURIComponent(search)}`,
//                     type: "GET",
//                     success: function (res) {
//                         let data = res.data || [];
//                         data.unshift({ _id: "all", projectName: "-- Select Project Name --" });
//                         success(data);
//                     },
//                     error: failure
//                 });
//             },
//             processResults: function (data) {
//                 return {
//                     results: data.map(project => ({
//                         id: project._id,
//                         text: project.projectName
//                     }))
//                 };
//             }
//         }
//     });

//     // Pre-select projectName if editing
//     if (isEdit && document.projectName) {
//         const projectOption = new Option(document.projectName.name || document.projectName.projectName, document.projectName._id, true, true);
//         $('#projectName').append(projectOption).trigger('change');
//     }

//     // --------------------------
//     // Department Select2
//     // --------------------------
//     $("#department").select2({
//         placeholder: "-- Select Department --",
//         allowClear: false,
//         ajax: {
//             url: '/api/departments/search',
//             dataType: 'json',
//             delay: 250,
//             data: function (params) {
//                 return { search: params.term || '', page: params.page || 1, limit: 10 };
//             },
//             processResults: function (data, params) {
//                 params.page = params.page || 1;
//                 let results = data.data.map(dep => ({ id: dep._id, text: dep.name }));
//                 results.unshift({ id: 'all', text: '-- Select Department --' });
//                 return { results, pagination: { more: data.pagination.more } };
//             },
//             cache: true
//         }
//     });

//     // Pre-select department if editing
//     if (isEdit && document.department) {
//         const departmentOption = new Option(document.department.name, document.department._id, true, true);
//         $('#department').append(departmentOption).trigger('change');
//     }

//     // --------------------------
//     // Project Manager Select2
//     // --------------------------
//     $('#projectManager').select2({
//         placeholder: '-- Select Project Manager --',
//         allowClear: false,
//         ajax: {
//             url: '/api/user/search',
//             dataType: 'json',
//             delay: 250,
//             data: function (params) {
//                 return { search: params.term || '', page: params.page || 1, limit: 10, profile_type: 'user' };
//             },
//             processResults: function (data, params) {
//                 params.page = params.page || 1;
//                 let results = data.users.map(u => ({ id: u._id, text: u.name }));
//                 results.unshift({ id: 'all', text: '-- Select Project Manager --' });
//                 return { results, pagination: { more: params.page * 10 < data.pagination.total } };
//             },
//             cache: true
//         },
//         minimumInputLength: 0
//     });

//     // Pre-select projectManager if editing
//     if (isEdit && document.projectManager) {
//         const managerOption = new Option(document.projectManager.name, document.projectManager._id, true, true);
//         $('#projectManager').append(managerOption).trigger('change');
//     }

//     function initializeDonorSelect2() {
//         $('#documentDonor').select2({
//             placeholder: '-- Select Donor Name --',
//             allowClear: false,
//             ajax: {
//                 url: '/api/user/search',
//                 dataType: 'json',
//                 delay: 250,
//                 data: function (params) {
//                     const projectId = $('#projectName').val();
//                     return {
//                         search: params.term || '',
//                         page: params.page || 1,
//                         limit: 10,
//                         projectId: projectId, // filter by selected project
//                         profile_type: 'donor' // filter for donor users
//                     };
//                 },
//                 processResults: function (data, params) {
//                     params.page = params.page || 1;
//                     const results = data.users.map(u => ({ id: u._id, text: u.name }));
//                     return {
//                         results,
//                         pagination: { more: params.page * 10 < data.pagination.total }
//                     };
//                 },
//                 cache: true
//             },
//             minimumInputLength: 0
//         });
//     }
//     if (isEdit && document.donor) {
//         const donorOption = new Option(document.donor.name, document.donor._id, true, true);
//         $('#documentDonor').append(donorOption).trigger('change');
//     }
//     function initializeVendorSelect2() {
//         $('#documentVendor').select2({
//             placeholder: '-- Select Vendor Name --',
//             allowClear: false,
//             ajax: {
//                 url: '/api/user/search',
//                 dataType: 'json',
//                 delay: 250,
//                 data: function (params) {
//                     const projectId = $('#projectName').val();
//                     return {
//                         search: params.term || '',
//                         page: params.page || 1,
//                         limit: 10,
//                         projectId: projectId, // filter by selected project
//                         profile_type: 'vendor' // filter for vendor users
//                     };
//                 },
//                 processResults: function (data, params) {
//                     params.page = params.page || 1;
//                     const results = data.users.map(u => ({ id: u._id, text: u.name }));
//                     return {
//                         results,
//                         pagination: { more: params.page * 10 < data.pagination.total }
//                     };
//                 },
//                 cache: true
//             },
//             minimumInputLength: 0
//         });
//     }

//     if (isEdit && document.vendor) {
//         const vendorOption = new Option(document.vendor.name, document.vendor._id, true, true);
//         $('#documentVendor').append(vendorOption).trigger('change');
//     }


//     // Remove existing files in edit mode
//     document.querySelectorAll('.remove-btn[data-file-id]').forEach(btn => {
//         btn.addEventListener('click', function () {
//             const fileId = this.getAttribute('data-file-id');
//             const fileItem = this.closest('.file-item');
//             fetch(`/api/files/${fileId}`, { method: 'DELETE' })
//                 .then(res => res.json())
//                 .then(data => data.success ? fileItem.remove() : showToast('Error deleting file: ' + data.message))
//                 .catch(err => { showToast('Error deleting file' + err, 'error'); });
//         });
//     });

//     function updateDirectoryPath() {
//         const projectText = $('#projectName option:selected').text();
//         const projectId = $('#projectName').val();
//         const departmentText = $('#department option:selected').text();
//         const departmentId = $('#department').val();
//         const folders = window.selectedFolders || [];

//         const pathSegments = [];

//         // Project (non-clickable)
//         if (projectText && projectText !== '-- Select Project Name --') {
//             pathSegments.push({ text: projectText, type: 'project', id: projectId });
//         }

//         // Department (clickable)
//         if (departmentText && departmentText !== '-- Select Department --') {
//             pathSegments.push({ text: departmentText, type: 'department', id: departmentId });
//         }

//         // Folders (clickable)
//         folders.forEach(folder => {
//             pathSegments.push({ text: folder.name, type: 'folder', id: folder.id });
//         });

//         const breadcrumbHtml = pathSegments.map((seg, i) => {
//             if (seg.type === 'project') {
//                 return `<span class="dir-text">${seg.text}</span>`;
//             } else {
//                 return `<a href="javascript:void(0)" class="dir-link" data-type="${seg.type}" data-id="${seg.id}" data-level="${i}">${seg.text}</a>`;
//             }
//         }).join(' / ');

//         $('#uploadDirectoryPath').html(breadcrumbHtml);

//         // Breadcrumb click
//         $('#uploadDirectoryPath .dir-link').off('click').on('click', async function () {
//             const type = $(this).data('type');
//             const id = $(this).data('id');
//             const level = $(this).data('level'); // breadcrumb index

//             const numFixed = 0
//                 + (projectText && projectText !== '-- Select Project Name --' ? 1 : 0)
//                 + (departmentText && departmentText !== '-- Select Department --' ? 1 : 0);

//             if (type === 'department') {
//                 window.selectedFolders = [];
//                 $('#selectedFolderId').val('');
//                 await loadFolders(null, []);
//             } else if (type === 'folder') {
//                 const newPath = window.selectedFolders.slice(0, level - numFixed + 1);
//                 window.selectedFolders = newPath;
//                 $('#selectedFolderId').val(id);
//                 await loadFolders(id, newPath);
//             }
//         });

//     }




//     // Call on page load and on select change
//     // toggleCreateFolderBtn();
//     // loadFolders();
//     // updateDirectoryPath();
//     $('#projectName, #department').on('change select2:select select2:clear', function () {
//         window.selectedFolders = [];
//         $('#selectedFolderId').val('');
//         toggleCreateFolderBtn();
//         loadFolders();
//         updateDirectoryPath();
//     });

//     $('#projectName').on('change', function () {
//         const projectId = $(this).val();
//         if (!projectId || projectId === 'all') {
//             // Reset department if no project selected
//             $('#department').val(null).trigger('change');
//             $('#documentDonor').val(null).trigger('change');
//             $('#documentVendor').val(null).trigger('change');

//             // Reload Select2 options based on new project
//             $('#documentDonor').select2('destroy');
//             $('#documentVendor').select2('destroy');
//         }
//     });

//     // --------------------------
//     // Initialize Donor and Vendor Select2
//     // --------------------------
//     initializeDonorSelect2();
//     initializeVendorSelect2();

//     // --------------------------
//     // Signature handling (Upload + Draw)
//     // --------------------------
//     const fileSign = document.getElementById('fileSign');
//     const uploadSignBtn = document.getElementById('uploadSignBtn');
//     const drawSignBtn = document.getElementById('drawSignBtn');
//     const signaturePreview = document.getElementById('signaturePreview');
//     const signatureData = document.getElementById('signatureData');

//     // 1. Upload signature from system
//     uploadSignBtn.addEventListener('click', () => fileSign.click());
//     fileSign.addEventListener('change', function () {
//         if (this.files && this.files[0]) {
//             const reader = new FileReader();
//             reader.onload = function (e) {
//                 signaturePreview.innerHTML = `<img src="${e.target.result}" alt="Signature" style="max-height:100%; max-width:100%; object-fit:contain;">`;
//                 signatureData.value = e.target.result; // save base64
//                 uploadSignBtn.textContent = "Update Signature";
//             };
//             reader.readAsDataURL(this.files[0]);
//         }
//     });

//     // 2. Draw signature on canvas
//     const modalEl = document.getElementById('signatureModal');
//     const modal = new bootstrap.Modal(modalEl);
//     const canvas = document.getElementById('sigCanvas');
//     const ctx = canvas.getContext('2d');
//     let drawing = false, paths = [], currentPath = [];

//     function resizeCanvas() {
//         canvas.width = canvas.offsetWidth;
//         canvas.height = canvas.offsetHeight;
//         redraw();
//     }
//     function redraw() {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         ctx.lineJoin = 'round'; ctx.lineCap = 'round';
//         ctx.lineWidth = 2; ctx.strokeStyle = '#000';
//         paths.forEach(path => {
//             ctx.beginPath();
//             ctx.moveTo(path[0].x, path[0].y);
//             path.forEach(p => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//         });
//         if (currentPath.length > 1) {
//             ctx.beginPath();
//             ctx.moveTo(currentPath[0].x, currentPath[0].y);
//             currentPath.forEach(p => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//         }
//     }
//     function addPoint(e) {
//         const rect = canvas.getBoundingClientRect();
//         const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
//         const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
//         currentPath.push({ x, y });
//     }
//     function startDraw(e) { e.preventDefault(); drawing = true; currentPath = []; addPoint(e); }
//     function draw(e) { if (!drawing) return; e.preventDefault(); addPoint(e); redraw(); }
//     function endDraw(e) { if (!drawing) return; drawing = false; if (currentPath.length > 0) paths.push([...currentPath]); currentPath = []; redraw(); }

//     canvas.addEventListener('mousedown', startDraw);
//     canvas.addEventListener('mousemove', draw);
//     canvas.addEventListener('mouseup', endDraw);
//     canvas.addEventListener('mouseleave', endDraw);
//     canvas.addEventListener('touchstart', startDraw);
//     canvas.addEventListener('touchmove', draw);
//     canvas.addEventListener('touchend', endDraw);

//     $('#undoSignBtn').on('click', () => { paths.pop(); redraw(); });
//     $('#clearSignBtn').on('click', () => { paths = []; redraw(); });

//     $('#saveSignBtn').on('click', () => {
//         if (paths.length === 0) { showToast('Please draw a signature first.', 'info'); return; }
//         const dataURL = canvas.toDataURL('image/png');
//         signaturePreview.innerHTML = `<img src="${dataURL}" style="max-height:100%; max-width:100%; object-fit:contain;">`;
//         signatureData.value = dataURL; // save base64
//         modal.hide();
//     });

//     drawSignBtn.addEventListener('click', () => modal.show());
//     modalEl.addEventListener('shown.bs.modal', resizeCanvas);
//     $(window).on('resize', resizeCanvas);

//     // --------------------------
//     // Form submission
//     // --------------------------
//     $('#documentForm').on('submit', async function (e) {
//         e.preventDefault();
//         $('#summernote').val($('.summernote').summernote('code'));

//         $('#submitBtn').prop('disabled', true).html(
//             '<span class="spinner-border spinner-border-sm" role="status"></span> ' + (isEdit ? "Updating..." : "Adding...")
//         );

//         try {
//             const fileIdsInput = document.createElement('input');
//             fileIdsInput.type = 'hidden';
//             fileIdsInput.name = 'fileIds';
//             fileIdsInput.value = JSON.stringify(uploadedFileIds || []);
//             this.appendChild(fileIdsInput);

//             // NEW: clear the raw file input so multer won't receive unexpected 'files' field
//             const rawFileInput = document.getElementById('fileInput');
//             if (rawFileInput) {
//                 try {
//                     rawFileInput.value = ''; // clears selected files from the <input>
//                 } catch (err) {
//                     // fallback: remove input from DOM temporarily
//                     rawFileInput.parentNode && rawFileInput.parentNode.removeChild(rawFileInput);
//                 }
//             }

//             const formData = new FormData(this);
//             const url = isEdit ? '/api/documents/' + documentId : '/api/documents';
//             const method = isEdit ? 'PATCH' : 'POST';

//             const response = await fetch(url, { method, body: formData });
//             const data = await response.json();

//             if (data.success) {
//                 const doc = data.data.document; // extract the document
//                 if (doc?.metadata?.fileName) {
//                     document.getElementById('successFileName').textContent = doc.metadata.fileName;
//                 }

//                 // Show modal
//                 const successModal = new bootstrap.Modal(document.getElementById('data-success-modal'));
//                 successModal.show();

//                 if (!isEdit) {
//                     document.getElementById('data-success-modal').addEventListener('hidden.bs.modal', function () {
//                         window.location.href = '/documents/add';
//                     }, { once: true });
//                 }
//             } else {
//                 showToast('Error: ' + (data.message || 'Unknown error occurred'), 'error');
//             }
//         } catch (error) {
//             showToast('An error occurred while submitting the form.' + error, 'error');
//         } finally {
//             $('#submitBtn').prop('disabled', false).html(isEdit ? "Update Document" : "Add Document");
//         }
//     });
// }

// );





//new 

// Global state
window.selectedFolders = [];   // [{ id, name }]
window.selectedProject = { id: null, name: null };
window.selectedDepartment = { id: null, name: null };
window.selectedProjectManager = { id: null, name: null };

const folderForm = document.getElementById('folderForm');
const folderContainer = document.getElementById('folderContainer');
const selectedFolderInput = document.getElementById('selectedFolderId');

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

$(document).ready(function () {
    // --------------------------
    // Initialize with edit data if available
    // --------------------------
    function initializeEditData() {
        if (!window.isEdit || !window.documentData) return;

        console.log('Initializing edit data:', window.documentData);

        // Initialize folders if exists
        if (window.documentData.folderId) {
            window.selectedFolders = [{
                id: window.documentData.folderId._id || window.documentData.folderId,
                name: window.documentData.folderId.name || 'Selected Folder'
            }];
            $('#selectedFolderId').val(window.documentData.folderId._id || window.documentData.folderId);
        }
    }

    // --------------------------
    // Summernote
    // --------------------------
    $('.summernote').summernote({
        height: 200,
        callbacks: {
            onChange: function (contents) {
                $('#summernote').val(contents);
            }
        }
    });

    // --------------------------
    // Select2
    // --------------------------
    $('.select2').select2();

    // --------------------------
    // Datepicker
    // --------------------------
    $('.datetimepicker').datetimepicker({
        format: 'DD-MM-YYYY',
        useCurrent: false
    });

    // --------------------------
    // Compliance radio buttons
    // --------------------------
    $('input[name="compliance"]').change(function () {
        if ($(this).val() === 'yes') {
            $('#expiryDateContainer').show();
            $('input[name="expiryDate"]').prop('required', true);
        } else {
            $('#expiryDateContainer').hide();
            $('input[name="expiryDate"]').prop('required', false);
        }
    });

    // --------------------------
    // Metadata modal
    // --------------------------
    $('#metadataForm').on('submit', function (e) {
        e.preventDefault();
        const formData = $(this).serializeArray();
        const metadata = {};
        formData.forEach(item => metadata[item.name] = item.value);

        $('#metadataInput').val(JSON.stringify(metadata));
        $('#metadataDisplay').val(metadata.fileName + ' - ' + metadata.fileDescription);
        $('#metadata-modal').modal('hide');
    });

    function toggleCreateFolderBtn() {
        const projectSelected = !!$('#projectName').val() && $('#projectName').val() !== 'all';

        // Enable/disable Create Folder button
        $('#createFolderBtn').prop('disabled', !projectSelected);

        // Enable/disable Upload Box
        if (projectSelected) {
            $('#uploadBox').css({ 'pointer-events': '', 'opacity': '' });
        } else {
            $('#uploadBox').css({ 'pointer-events': 'none', 'opacity': 0.6 });
        }
    }

    async function loadFolders(rootId = null, parentPath = []) {
        const departmentId = $('#department').val();
        const projectId = $('#projectName').val();

        // Reset if nothing selected
        if ((!projectId || projectId === 'all') && (!departmentId || departmentId === 'all')) {
            $('#folderContainer').empty();
            window.selectedFolders = [];
            $('#selectedFolderId').val('');
            updateDirectoryPath();
            return;
        }

        const query = new URLSearchParams();
        if (departmentId && departmentId !== 'all') query.append('departmentId', departmentId);
        if (projectId && projectId !== 'all') query.append('projectId', projectId);
        if (rootId) query.append('rootId', rootId);

        try {
            const res = await fetch(`/api/folders/tree/structure?${query.toString()}`);
            const data = await res.json();
            if (!data.success) return;

            const folders = data.tree || [];
            const container = $('#folderContainer').empty(); // Clear old children

            // If editing and we have a selected folder, find and select it
            let foundSelectedFolder = false;

            folders.forEach((folder, index) => {
                const subCount = folder.children?.length || 0;
                const folderCard = $(`
                <div class="folder-card" style="width:80px;">
                    <div class="fldricon"><img src="/img/icons/folder.png"></div>
                    <div class="fldrname text-truncate">${folder.name}</div>
                    ${subCount ? `<span class="badge">${subCount}</span>` : ''}
                </div>
            `);

                folderCard.data('folder', folder);

                // Check if this is the selected folder in edit mode
                const isSelectedFolder = window.isEdit &&
                    window.documentData &&
                    window.documentData.folderId &&
                    (folder._id === window.documentData.folderId._id || folder._id === window.documentData.folderId);

                if (isSelectedFolder) {
                    folderCard.addClass('active border-primary');
                    window.selectedFolders = [...parentPath, { id: folder._id, name: folder.name }];
                    $('#selectedFolderId').val(folder._id);
                    foundSelectedFolder = true;
                }

                // Single click: select folder
                folderCard.on('click', function () {
                    $('.folder-card').removeClass('active border-primary').addClass('border');
                    folderCard.addClass('active border-primary');

                    // Replace selectedFolders with new path up to this folder
                    window.selectedFolders = [...parentPath, { id: folder._id, name: folder.name }];
                    $('#selectedFolderId').val(folder._id);
                    updateDirectoryPath();
                });

                // Double click: open folder
                if (subCount > 0) {
                    folderCard.on('dblclick', async function () {
                        const newPath = [...parentPath, { id: folder._id, name: folder.name }];
                        await loadFolders(folder._id, newPath); // pass new path
                    });
                }

                container.append(folderCard);

                // Auto-select first folder at root if no folder selected and not in edit mode
                if (index === 0 && !rootId && !window.isEdit && !foundSelectedFolder) {
                    folderCard.trigger('click');
                }
            });

            updateDirectoryPath();
        } catch (err) {
            console.error("Error loading folders:", err);
        }
    }

    $('#folder-modal').on('show.bs.modal', function () {
        const projectText = $('#projectName option:selected').text();
        const projectId = $('#projectName').val();
        const departmentText = $('#department option:selected').text();
        const departmentId = $('#department').val();
        const folders = window.selectedFolders || [];

        const parentFolderSelect = $('#parentFolder');
        parentFolderSelect.empty();

        // ---------------------------
        // 1. Top-Level (no parent)
        // ---------------------------
        parentFolderSelect.append(
            new Option('-- Top-Level (No Parent) --', '', false, false)
        );

        // ---------------------------
        // 2. Project / Department
        // ---------------------------
        if (projectId && projectId !== 'all' && departmentId && departmentId !== 'all') {
            const isSelected = folders.length === 0; // select if no folder selected
            parentFolderSelect.append(
                new Option(`${projectText} / ${departmentText}`, 'root', false, isSelected)
            );
        }

        // ---------------------------
        // 3. Existing folder chain
        // ---------------------------
        folders.forEach((f, i) => {
            const fullPath = `${projectText} / ${departmentText} /${folders.slice(0, i + 1).map(ff => ff.name).join(' / ')}`;
            const isSelected = i === folders.length - 1; // last folder selected by default
            parentFolderSelect.append(new Option(fullPath, f.id, false, isSelected));
        });

        // Trigger change for select2
        parentFolderSelect.trigger('change');
    });

    // Run on page load
    initializeEditData();
    toggleCreateFolderBtn();
    loadFolders();
    updateDirectoryPath();

    // --------------------------
    // Handle folder creation
    $('#createFolderForm').on('submit', async function (e) {
        e.preventDefault();

        const folderName = $('#folderName').val().trim();
        const projectId = $('#projectName').val();
        const departmentId = $('#department').val();
        let parentId = $('#parentFolder').val();

        // If the user selected "Root" or no parent, set null for top-level
        if (!parentId || parentId === '') {
            parentId = null;
        }
        else if (parentId === 'root') parentId = null;
        // Validation
        if (!folderName || !projectId || !departmentId) {
            showToast('Please select Project, Department, and provide folder name.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: folderName, parentId, projectId, departmentId })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Could not create folder');

            $('#folder-modal').modal('hide');
            $('#createFolderForm')[0].reset();

            // Reload current folder to show new folder at the end
            let newPath = [];

            if (parentId) {
                // If creating inside a subfolder, find the path to parent
                const parentIndex = window.selectedFolders.findIndex(f => f.id === parentId);
                if (parentIndex >= 0) {
                    newPath = window.selectedFolders.slice(0, parentIndex + 1);
                } else {
                    // If parent is selected from modal but not in selectedFolders
                    newPath = [...window.selectedFolders];
                    const parentName = $('#parentFolder option:selected').text();
                    if (parentName) {
                        newPath.push({ id: parentId, name: parentName });
                    }
                }
            }

            // Reload the parent folder and auto-select it
            await loadFolders(parentId, newPath);
            // Inside the success block, after loadFolders
            const container = $('#folderContainer');
            const newFolderCard = container.find('.folder-card').filter(function () {
                return $(this).find('.fldrname').text() === folderName;
            }).first();

            if (newFolderCard.length) {
                newFolderCard.trigger('click');
            }

            // Update selected folder to parent folder
            window.selectedFolders = newPath;
            $('#selectedFolderId').val(parentId);
            updateDirectoryPath();

            showToast('Folder created successfully!', 'success');
        } catch (err) {
            showToast(err.message || 'Something went wrong while creating the folder.', 'error');
        }
    });

    const uploadBox = document.getElementById("uploadBox");
    const fileInput = document.getElementById("fileInput");
    const fileList = document.getElementById("fileList");
    let uploadedFileIds = []; // store server-side file IDs

    // Modal elements
    const trashModal = new bootstrap.Modal(document.getElementById("trashdoc-modal"));
    const trashModalTitle = document.querySelector("#trashdocLabel");
    const trashModalBody = document.querySelector("#trashdoc-modal .modal-body");
    const confirmTrashBtn = document.getElementById("confirm-trash-folder");

    let fileToDelete = null; // store fileItem being deleted

    // Click to open file dialog
    uploadBox.addEventListener("click", () => fileInput.click());

    // File input change
    fileInput.addEventListener("change", async (e) => {
        await handleFileUpload(e.target.files);
    });

    // Drag & drop
    uploadBox.addEventListener("dragover", e => {
        e.preventDefault();
        uploadBox.classList.add("dragover");
    });
    uploadBox.addEventListener("dragleave", () => uploadBox.classList.remove("dragover"));
    uploadBox.addEventListener("drop", async e => {
        e.preventDefault();
        await handleFileUpload(e.dataTransfer.files);
    });

    // Handle file uploads
    async function handleFileUpload(files) {
        const folderId = document.getElementById('selectedFolderId').value;
        if (!folderId) return showToast("Please select a folder.", 'info');

        for (const file of files) {
            const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 8);

            const fileItem = document.createElement("div");
            fileItem.className = "file-item col-sm-5 mb-3 p-3 border rounded";
            fileItem.setAttribute("data-file-id", tempId);

            fileItem.innerHTML = `
            <div class="file-info d-flex align-items-center">
                <i class="fa-solid fa-file fa-2x me-3"></i>
                <div class="flex-grow-1">
                    <h6 class="mb-0 text-truncate">${file.name}</h6>
                    <small class="text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
            </div>
            <div class="file-progress mt-2">
                <div class="progress">
                    <div class="progress-bar bg-success" role="progressbar" style="width:0%">0%</div>
                </div>
            </div>
            <button class="remove-btn btn btn-sm btn-danger mt-2" data-file-id="${tempId}" disabled>
                <i class="fa-solid fa-xmark"></i> Remove
            </button>
        `;
            fileList.appendChild(fileItem);

            const progressBar = fileItem.querySelector(".progress-bar");
            const removeBtn = fileItem.querySelector(".remove-btn");

            try {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch(`/api/files/upload/${folderId}`, { method: 'POST', body: formData });
                const data = await res.json();

                if (!data.success) throw new Error(data.message || "Upload failed");

                const uploadedFile = data.files[0];
                const fileId = uploadedFile.fileId;

                uploadedFileIds.push(fileId);
                fileItem.setAttribute("data-file-id", fileId);
                removeBtn.setAttribute("data-file-id", fileId);
                removeBtn.disabled = false;

                progressBar.style.width = "100%";
                progressBar.textContent = "Uploaded";

            } catch (err) {
                progressBar.classList.remove("bg-success");
                progressBar.classList.add("bg-danger");
                progressBar.textContent = "Error";
                console.error("Upload failed:", err);
            }
        }
    }

    // Remove file handler using modal
    fileList.addEventListener("click", function (e) {
        const btn = e.target.closest(".remove-btn");
        if (!btn) return;

        fileToDelete = btn.closest(".file-item");
        const fileId = btn.getAttribute("data-file-id");
        if (!fileToDelete || !fileId) return;

        // Update modal content
        trashModalTitle.innerHTML = `
        <img src="/img/icons/bin.png" class="me-2" style="width:24px; height:24px;">
        Delete File
    `;
        trashModalBody.innerHTML = `
        You are about to delete <strong>"${fileToDelete.querySelector("h6").textContent}"</strong>.<br>
        This action cannot be undone. Are you sure you want to proceed?
    `;

        trashModal.show();
    });

    // Confirm deletion
    confirmTrashBtn.addEventListener("click", async () => {
        if (!fileToDelete) return;

        const fileId = fileToDelete.getAttribute("data-file-id");

        try {
            if (uploadedFileIds.includes(fileId)) {
                const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Delete failed");
                uploadedFileIds = uploadedFileIds.filter(id => id !== fileId);
            }

            fileToDelete.remove();
            fileToDelete = null;
            trashModal.hide();
            showToast("File removed successfully!", 'success');

        } catch (err) {
            showToast("Error deleting file: " + err.message, 'error');
            trashModal.hide();
        }
    });

    $('#parentFolder').select2({
        dropdownParent: $('#folder-modal'), // ensures it stays inside modal
        width: '100%',
        placeholder: "-- Root (No Parent) --",
        allowClear: true
    });

    // --------------------------
    // Project Name Select2
    // --------------------------
    $("#projectName").select2({
        placeholder: "-- Select Project Name --",
        allowClear: false,
        ajax: {
            delay: 300,
            transport: function (params, success, failure) {
                const search = params.data.term || "";
                $.ajax({
                    url: `/api/projects?search=${encodeURIComponent(search)}`,
                    type: "GET",
                    success: function (res) {
                        let data = res.data || [];
                        data.unshift({ _id: "all", projectName: "-- Select Project Name --" });
                        success(data);
                    },
                    error: failure
                });
            },
            processResults: function (data) {
                return {
                    results: data.map(project => ({
                        id: project._id,
                        text: project.projectName
                    }))
                };
            }
        }
    });

    // Pre-select projectName if editing
    if (window.isEdit && window.documentData && window.documentData.project) {
        const projectOption = new Option(
            window.documentData.project.projectName || window.documentData.project.name,
            window.documentData.project._id,
            true,
            true
        );
        $('#projectName').append(projectOption).trigger('change');
    }

    // --------------------------
    // Department Select2
    // --------------------------
    $("#department").select2({
        placeholder: "-- Select Department --",
        allowClear: false,
        ajax: {
            url: '/api/departments/search',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { search: params.term || '', page: params.page || 1, limit: 10 };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                let results = data.data.map(dep => ({ id: dep._id, text: dep.name }));
                results.unshift({ id: 'all', text: '-- Select Department --' });
                return { results, pagination: { more: data.pagination.more } };
            },
            cache: true
        }
    });

    // Pre-select department if editing
    if (window.isEdit && window.documentData && window.documentData.department) {
        const departmentOption = new Option(
            window.documentData.department.name,
            window.documentData.department._id,
            true,
            true
        );
        $('#department').append(departmentOption).trigger('change');
    }

    // --------------------------
    // Project Manager Select2
    // --------------------------
    $('#projectManager').select2({
        placeholder: '-- Select Project Manager --',
        allowClear: false,
        ajax: {
            url: '/api/user/search',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    search: params.term || '',
                    page: params.page || 1,
                    limit: 10,
                    profile_type: 'user'
                };
            },
            processResults: function (data, params) {
                params.page = params.page || 1;
                let results = data.users.map(u => ({ id: u._id, text: u.name }));
                results.unshift({ id: 'all', text: '-- Select Project Manager --' });
                return {
                    results,
                    pagination: { more: params.page * 10 < data.pagination.total }
                };
            },
            cache: true
        },
        minimumInputLength: 0
    });

    // Pre-select projectManager if editing
    if (window.isEdit && window.documentData && window.documentData.projectManager) {
        const managerOption = new Option(
            window.documentData.projectManager.name,
            window.documentData.projectManager._id,
            true,
            true
        );
        $('#projectManager').append(managerOption).trigger('change');
    }

    function initializeDonorSelect2() {
        $('#documentDonor').select2({
            placeholder: '-- Select Donor Name --',
            allowClear: false,
            ajax: {
                url: '/api/user/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    const projectId = $('#projectName').val();
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 10,
                        projectId: projectId, // filter by selected project
                        profile_type: 'donor' // filter for donor users
                    };
                },
                processResults: function (data, params) {
                    params.page = params.page || 1;
                    const results = data.users.map(u => ({ id: u._id, text: u.name }));
                    return {
                        results,
                        pagination: { more: params.page * 10 < data.pagination.total }
                    };
                },
                cache: true
            },
            minimumInputLength: 0
        });

        // Pre-select donor if editing
        if (window.isEdit && window.documentData && window.documentData.documentDonor) {
            const donorOption = new Option(
                window.documentData.documentDonor.name,
                window.documentData.documentDonor._id,
                true,
                true
            );
            $('#documentDonor').append(donorOption).trigger('change');
        }
    }

    function initializeVendorSelect2() {
        $('#documentVendor').select2({
            placeholder: '-- Select Vendor Name --',
            allowClear: false,
            ajax: {
                url: '/api/user/search',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    const projectId = $('#projectName').val();
                    return {
                        search: params.term || '',
                        page: params.page || 1,
                        limit: 10,
                        projectId: projectId, // filter by selected project
                        profile_type: 'vendor' // filter for vendor users
                    };
                },
                processResults: function (data, params) {
                    params.page = params.page || 1;
                    const results = data.users.map(u => ({ id: u._id, text: u.name }));
                    return {
                        results,
                        pagination: { more: params.page * 10 < data.pagination.total }
                    };
                },
                cache: true
            },
            minimumInputLength: 0
        });

        // Pre-select vendor if editing
        if (window.isEdit && window.documentData && window.documentData.documentVendor) {
            const vendorOption = new Option(
                window.documentData.documentVendor.name,
                window.documentData.documentVendor._id,
                true,
                true
            );
            $('#documentVendor').append(vendorOption).trigger('change');
        }
    }

    // Remove existing files in edit mode
    document.querySelectorAll('.remove-btn[data-file-id]').forEach(btn => {
        btn.addEventListener('click', function () {
            const fileId = this.getAttribute('data-file-id');
            const fileItem = this.closest('.file-item');
            fetch(`/api/files/${fileId}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => data.success ? fileItem.remove() : showToast('Error deleting file: ' + data.message))
                .catch(err => { showToast('Error deleting file' + err, 'error'); });
        });
    });

    function updateDirectoryPath() {
        const projectText = $('#projectName option:selected').text();
        const projectId = $('#projectName').val();
        const departmentText = $('#department option:selected').text();
        const departmentId = $('#department').val();
        const folders = window.selectedFolders || [];

        const pathSegments = [];

        // Project (non-clickable)
        if (projectText && projectText !== '-- Select Project Name --') {
            pathSegments.push({ text: projectText, type: 'project', id: projectId });
        }

        // Department (clickable)
        if (departmentText && departmentText !== '-- Select Department --') {
            pathSegments.push({ text: departmentText, type: 'department', id: departmentId });
        }

        // Folders (clickable)
        folders.forEach(folder => {
            pathSegments.push({ text: folder.name, type: 'folder', id: folder.id });
        });

        const breadcrumbHtml = pathSegments.map((seg, i) => {
            if (seg.type === 'project') {
                return `<span class="dir-text">${seg.text}</span>`;
            } else {
                return `<a href="javascript:void(0)" class="dir-link" data-type="${seg.type}" data-id="${seg.id}" data-level="${i}">${seg.text}</a>`;
            }
        }).join(' / ');

        $('#uploadDirectoryPath').html(breadcrumbHtml);

        // Breadcrumb click
        $('#uploadDirectoryPath .dir-link').off('click').on('click', async function () {
            const type = $(this).data('type');
            const id = $(this).data('id');
            const level = $(this).data('level'); // breadcrumb index

            const numFixed = 0
                + (projectText && projectText !== '-- Select Project Name --' ? 1 : 0)
                + (departmentText && departmentText !== '-- Select Department --' ? 1 : 0);

            if (type === 'department') {
                window.selectedFolders = [];
                $('#selectedFolderId').val('');
                await loadFolders(null, []);
            } else if (type === 'folder') {
                const newPath = window.selectedFolders.slice(0, level - numFixed + 1);
                window.selectedFolders = newPath;
                $('#selectedFolderId').val(id);
                await loadFolders(id, newPath);
            }
        });
    }

    // Call on page load and on select change
    $('#projectName, #department').on('change select2:select select2:clear', function () {
        window.selectedFolders = [];
        $('#selectedFolderId').val('');
        toggleCreateFolderBtn();
        loadFolders();
        updateDirectoryPath();

        // Reinitialize donor and vendor when project changes
        initializeDonorSelect2();
        initializeVendorSelect2();
    });

    $('#projectName').on('change', function () {
        const projectId = $(this).val();
        if (!projectId || projectId === 'all') {
            // Reset department if no project selected
            $('#department').val(null).trigger('change');
            $('#documentDonor').val(null).trigger('change');
            $('#documentVendor').val(null).trigger('change');
        }

        // Always reinitialize donor and vendor when project changes
        initializeDonorSelect2();
        initializeVendorSelect2();
    });

    // --------------------------
    // Initialize Donor and Vendor Select2
    // --------------------------
    initializeDonorSelect2();
    initializeVendorSelect2();

    // --------------------------
    // Signature handling (Upload + Draw)
    // --------------------------
    const fileSign = document.getElementById('fileSign');
    const uploadSignBtn = document.getElementById('uploadSignBtn');
    const drawSignBtn = document.getElementById('drawSignBtn');
    const signaturePreview = document.getElementById('signaturePreview');
    const signatureData = document.getElementById('signatureData');

    // 1. Upload signature from system
    uploadSignBtn.addEventListener('click', () => fileSign.click());
    fileSign.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                signaturePreview.innerHTML = `<img src="${e.target.result}" alt="Signature" style="max-height:100%; max-width:100%; object-fit:contain;">`;
                signatureData.value = e.target.result; // save base64
                uploadSignBtn.textContent = "Update Signature";
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // 2. Draw signature on canvas
    const modalEl = document.getElementById('signatureModal');
    const modal = new bootstrap.Modal(modalEl);
    const canvas = document.getElementById('sigCanvas');
    const ctx = canvas.getContext('2d');
    let drawing = false, paths = [], currentPath = [];

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        redraw();
    }
    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.lineWidth = 2; ctx.strokeStyle = '#000';
        paths.forEach(path => {
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });
        if (currentPath.length > 1) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    }
    function addPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        currentPath.push({ x, y });
    }
    function startDraw(e) { e.preventDefault(); drawing = true; currentPath = []; addPoint(e); }
    function draw(e) { if (!drawing) return; e.preventDefault(); addPoint(e); redraw(); }
    function endDraw(e) { if (!drawing) return; drawing = false; if (currentPath.length > 0) paths.push([...currentPath]); currentPath = []; redraw(); }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', endDraw);

    $('#undoSignBtn').on('click', () => { paths.pop(); redraw(); });
    $('#clearSignBtn').on('click', () => { paths = []; redraw(); });

    $('#saveSignBtn').on('click', () => {
        if (paths.length === 0) { showToast('Please draw a signature first.', 'info'); return; }
        const dataURL = canvas.toDataURL('image/png');
        signaturePreview.innerHTML = `<img src="${dataURL}" style="max-height:100%; max-width:100%; object-fit:contain;">`;
        signatureData.value = dataURL; // save base64
        modal.hide();
    });

    drawSignBtn.addEventListener('click', () => modal.show());
    modalEl.addEventListener('shown.bs.modal', resizeCanvas);
    $(window).on('resize', resizeCanvas);

    // --------------------------
    // Form submission
    // --------------------------
    $('#documentForm').on('submit', async function (e) {
        e.preventDefault();
        $('#summernote').val($('.summernote').summernote('code'));

        $('#submitBtn').prop('disabled', true).html(
            '<span class="spinner-border spinner-border-sm" role="status"></span> ' + (window.isEdit ? "Updating..." : "Adding...")
        );

        try {
            const fileIdsInput = document.createElement('input');
            fileIdsInput.type = 'hidden';
            fileIdsInput.name = 'fileIds';
            fileIdsInput.value = JSON.stringify(uploadedFileIds || []);
            this.appendChild(fileIdsInput);

            // NEW: clear the raw file input so multer won't receive unexpected 'files' field
            const rawFileInput = document.getElementById('fileInput');
            if (rawFileInput) {
                try {
                    rawFileInput.value = ''; // clears selected files from the <input>
                } catch (err) {
                    // fallback: remove input from DOM temporarily
                    rawFileInput.parentNode && rawFileInput.parentNode.removeChild(rawFileInput);
                }
            }

            const formData = new FormData(this);
            const url = window.isEdit ? '/api/documents/' + window.documentId : '/api/documents';
            const method = window.isEdit ? 'PATCH' : 'POST';

            const response = await fetch(url, { method, body: formData });
            const data = await response.json();

            if (data.success) {
                const doc = data.data.document; // extract the document
                if (doc?.metadata?.fileName) {
                    document.getElementById('successFileName').textContent = doc.metadata.fileName;
                }

                // Show modal
                const successModal = new bootstrap.Modal(document.getElementById('data-success-modal'));
                successModal.show();

                if (!window.isEdit) {
                    document.getElementById('data-success-modal').addEventListener('hidden.bs.modal', function () {
                        window.location.href = '/documents/add';
                    }, { once: true });
                }
            } else {
                showToast('Error: ' + (data.message || 'Unknown error occurred'), 'error');
            }
        } catch (error) {
            showToast('An error occurred while submitting the form.' + error, 'error');
        } finally {
            $('#submitBtn').prop('disabled', false).html(window.isEdit ? "Update Document" : "Add Document");
        }
    });
});