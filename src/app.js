import "dotenv/config"; // loads .env
import express from "express";
import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import methodOverride from "method-override";
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import ApiRoutes from "./routes/index.js";
import pageRoutes from "./routes/web/index.js";
import errorHandler from "./middlewares/errorHandler.js";
import { formatDateDDMMYYYY } from "./utils/formatDate.js";
import { startCleanupJob } from "./helper/node-cron.js";

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false }));

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "super-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
            ttl: 60 * 60, // 1 hour
        }),
        cookie: {
            maxAge: 1000 * 60 * 60, // 1 hour
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // HTTPS only in production
            sameSite: "lax",
        },
    })
);


app.use(methodOverride("_method"));
app.use(compression());
app.use(morgan("dev"));
app.use(flash());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views
app.set("view engine", "ejs");
app.set("views", path.resolve("views"));
app.use(express.static(path.resolve("public")));

// Global locals
app.use((req, res, next) => {
    const user = req.user || req.session.user || {};
    res.locals.BASE_URL = process.env.BASE_URL || "";
    res.locals.designation_id = user.designation_id || null;
    res.locals.department = user.department || null;
    res.locals.profile_image = user.profile_image || null;
    res.locals.profile_type = user.profile_type || null;
    res.locals.email = user.email || null;
    res.locals.name = user.name || null;
    res.locals.formatDateDDMMYYYY = formatDateDDMMYYYY;

    next();
});

// Routes
app.use("/api", ApiRoutes);
app.use("/", pageRoutes);

// Start cleanup cron job
startCleanupJob();
// Error handling
app.use(errorHandler);

// Make sure to export the app
export default app;



// window.selectedFolders = []; // [{ id, name }]
// let uploadedFileIds = [];
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

//         // If nothing selected, reset
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
//             const container = $('#folderContainer').empty();

//             folders.forEach((folder, index) => {
//                 const subCount = folder.children?.length || 0;
//                 const folderCard = $(`
//         <div class="folder-card" style="width:80px;">
//             <div class="fldricon"><img src="/img/icons/folder.png"></div>
//             <div class="fldrname text-truncate">${folder.name}</div>
//             ${subCount ? `<span class="badge">${subCount}</span>` : ''}
//         </div>
//     `);

//                 folderCard.data('folder', folder); // store full folder object

//                 // ----------- SINGLE CLICK HANDLER -----------
//                 folderCard.on('click', function () {
//                     $('.folder-card').removeClass('active border-primary').addClass('border');
//                     folderCard.addClass('active border-primary');

//                     // <--- REPLACE HERE WITH FIXED CODE --->
//                     window.selectedFolders = [...parentPath, { id: folder._id, name: folder.name }];
//                     $('#selectedFolderId').val(folder._id);
//                     updateDirectoryPath();
//                 });

//                 // ----------- DOUBLE CLICK HANDLER -----------
//                 folderCard.on('dblclick', async function () {
//                     const newPath = [...parentPath, { id: folder._id, name: folder.name }];
//                     await loadFolders(folder._id, newPath);
//                 });

//                 container.append(folderCard);

//                 // Auto-select first folder at root
//                 if (index === 0 && !rootId) folderCard.trigger('click');
//             });


//             updateDirectoryPath();
//         } catch (err) {
//             console.error("Error loading folders:", err);
//         }
//     }


//     $('#folder-modal').on('show.bs.modal', function () {
//         if (window.selectedFolders.length === 0) {
//             $('#parentFolder').val(''); // no parent selected
//         } else {
//             // Join all folder names with " / "
//             const fullPath = window.selectedFolders.map(f => f.name).join(' / ');
//             $('#parentFolder').val(fullPath);
//         }
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
//         const parentId = $('#selectedFolderId').val() || null;

//         if (!folderName || !projectId || !departmentId) {
//             alert('Please select Project, Department, and provide folder name.');
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
//             await loadFolders(parentId, window.selectedFolders.slice(0, -1));

//             showToast('Folder created successfully!', 'success');
//         } catch (err) {
//             console.error(err);
//             showToast(err.message || 'Something went wrong while creating the folder.', 'error');
//         }
//     });


//     // --------------------------
//     // File upload handling
//     // --------------------------
//     const uploadBox = document.getElementById("uploadBox");
//     const fileInput = document.getElementById("fileInput");
//     const fileList = document.getElementById("fileList");

//     uploadBox.addEventListener("click", () => fileInput.click());

//     fileInput.addEventListener("change", async (e) => {
//         await handleFileUpload(e.target.files); // send all selected files
//     });


//     uploadBox.addEventListener("dragover", e => {
//         e.preventDefault();
//         uploadBox.classList.add("dragover");
//     });

//     uploadBox.addEventListener("dragleave", () => {
//         uploadBox.classList.remove("dragover");
//     });

//     uploadBox.addEventListener("drop", async (e) => {
//         e.preventDefault();
//         await handleFileUpload(e.dataTransfer.files); // send all dropped files
//     });

//     async function handleFileUpload(files) {
//         const folderId = $('#selectedFolderId').val();
//         if (!folderId) return alert("Please select a folder.");

//         const formData = new FormData();
//         for (const file of files) {
//             formData.append('file', file); // append all files
//         }

//         const response = await fetch(`/api/files/upload/${folderId}`, {
//             method: 'POST',
//             body: formData
//         });

//         const data = await response.json();
//         if (data.success) {
//             data.files.forEach(f => {
//                 uploadedFileIds.push(f.fileId);

//                 // Add file to the visible list
//                 const li = document.createElement('li');
//                 li.className = 'file-item';
//                 li.textContent = f.originalName;

//                 const removeBtn = document.createElement('button');
//                 removeBtn.type = 'button';
//                 removeBtn.textContent = 'Remove';
//                 removeBtn.className = 'remove-btn';
//                 removeBtn.addEventListener('click', async () => {
//                     try {
//                         const res = await fetch(`/api/files/${f.fileId}`, { method: 'DELETE' });
//                         const result = await res.json();
//                         if (result.success) {
//                             li.remove();
//                             uploadedFileIds = uploadedFileIds.filter(id => id !== f.fileId);
//                         } else {
//                             alert('Failed to remove file: ' + result.message);
//                         }
//                     } catch (err) {
//                         console.error(err);
//                         alert('Error removing file');
//                     }
//                 });

//                 li.appendChild(removeBtn);
//                 fileList.appendChild(li);
//             });
//         } else {
//             console.error("Upload failed:", data.message);
//         }
//     }



//     $(document).ready(function () {
//         // --------------------------
//         // Project Name Select2
//         // --------------------------
//         $("#projectName").select2({
//             placeholder: "-- Select Project Name --",
//             allowClear: false,
//             ajax: {
//                 delay: 300,
//                 transport: function (params, success, failure) {
//                     const search = params.data.term || "";
//                     $.ajax({
//                         url: `/api/projects?search=${encodeURIComponent(search)}`,
//                         type: "GET",
//                         success: function (res) {
//                             let data = res.data || [];
//                             data.unshift({ _id: "all", projectName: "-- Select Project Name --" });
//                             success(data);
//                         },
//                         error: failure
//                     });
//                 },
//                 processResults: function (data) {
//                     return {
//                         results: data.map(project => ({
//                             id: project._id,
//                             text: project.projectName
//                         }))
//                     };
//                 }
//             }
//         });

//         // Pre-select projectName if editing
//         if (isEdit && document.projectName) {
//             const projectOption = new Option(document.projectName.name || document.projectName.projectName, document.projectName._id, true, true);
//             $('#projectName').append(projectOption).trigger('change');
//         }

//         // --------------------------
//         // Department Select2
//         // --------------------------
//         $("#department").select2({
//             placeholder: "-- Select Department --",
//             allowClear: false,
//             ajax: {
//                 url: '/api/departments/search',
//                 dataType: 'json',
//                 delay: 250,
//                 data: function (params) {
//                     return { search: params.term || '', page: params.page || 1, limit: 10 };
//                 },
//                 processResults: function (data, params) {
//                     params.page = params.page || 1;
//                     let results = data.data.map(dep => ({ id: dep._id, text: dep.name }));
//                     results.unshift({ id: 'all', text: '-- Select Department --' });
//                     return { results, pagination: { more: data.pagination.more } };
//                 },
//                 cache: true
//             }
//         });

//         // Pre-select department if editing
//         if (isEdit && document.department) {
//             const departmentOption = new Option(document.department.name, document.department._id, true, true);
//             $('#department').append(departmentOption).trigger('change');
//         }

//         // --------------------------
//         // Project Manager Select2
//         // --------------------------
//         $('#projectManager').select2({
//             placeholder: '-- Select Project Manager --',
//             allowClear: false,
//             ajax: {
//                 url: '/api/user/search',
//                 dataType: 'json',
//                 delay: 250,
//                 data: function (params) {
//                     return { search: params.term || '', page: params.page || 1, limit: 10, profile_type: 'user' };
//                 },
//                 processResults: function (data, params) {
//                     params.page = params.page || 1;
//                     let results = data.users.map(u => ({ id: u._id, text: u.name }));
//                     results.unshift({ id: 'all', text: '-- Select Project Manager --' });
//                     return { results, pagination: { more: params.page * 10 < data.pagination.total } };
//                 },
//                 cache: true
//             },
//             minimumInputLength: 0
//         });

//         // Pre-select projectManager if editing
//         if (isEdit && document.projectManager) {
//             const managerOption = new Option(document.projectManager.name, document.projectManager._id, true, true);
//             $('#projectManager').append(managerOption).trigger('change');
//         }
//     });


//     // Remove existing files in edit mode
//     document.querySelectorAll('.remove-btn[data-file-id]').forEach(btn => {
//         btn.addEventListener('click', function () {
//             const fileId = this.getAttribute('data-file-id');
//             const fileItem = this.closest('.file-item');
//             fetch(`/api/files/${fileId}`, { method: 'DELETE' })
//                 .then(res => res.json())
//                 .then(data => data.success ? fileItem.remove() : alert('Error deleting file: ' + data.message))
//                 .catch(err => { console.error(err); alert('Error deleting file'); });
//         });
//     });

//     function updateDirectoryPath() {
//         const projectText = $('#projectName option:selected').text();
//         const projectId = $('#projectName').val();
//         const departmentText = $('#department option:selected').text();
//         const departmentId = $('#department').val();
//         const folders = window.selectedFolders || [];

//         const pathSegments = [];

//         // Show project name first (non-clickable)
//         if (projectText && projectText !== '-- Select Project Name --') {
//             pathSegments.push({ text: projectText, type: 'project', id: projectId });
//         }

//         // Department clickable
//         if (departmentText && departmentText !== '-- Select Department --') {
//             pathSegments.push({ text: departmentText, type: 'department', id: departmentId });
//         }

//         // Folders clickable
//         folders.forEach(folder => {
//             pathSegments.push({ text: folder.name, type: 'folder', id: folder.id });
//         });

//         const breadcrumbHtml = pathSegments.map((seg, i) => {
//             if (seg.type === 'project') {
//                 // Non-clickable project
//                 return `<span class="dir-text">${seg.text}</span>`;
//             } else {
//                 // Clickable department/folder
//                 return `<a href="javascript:void(0)" class="dir-link" data-type="${seg.type}" data-id="${seg.id}" data-index="${i}">${seg.text}</a>`;
//             }
//         }).join(' / ');

//         $('#uploadDirectoryPath').html(breadcrumbHtml);

//         // Breadcrumb click handler
//         $('#uploadDirectoryPath .dir-link').off('click').on('click', async function () {
//             const type = $(this).data('type');
//             const id = $(this).data('id');
//             const index = $(this).data('index');

//             if (type === 'department') {
//                 window.selectedFolders = [];
//                 $('#selectedFolderId').val('');
//                 await loadFolders(null, []);
//             } else if (type === 'folder') {
//                 const newPath = window.selectedFolders.slice(0, index + 1);
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
//         if (paths.length === 0) { alert('Please draw a signature first.'); return; }
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
//                 if (data.document?.metadata?.fileName) {
//                     $('#successFileName').text(data.document.metadata.fileName);
//                 }
//                 $('#data-success-modal').modal('show');

//                 if (!isEdit) {
//                     $('#data-success-modal').on('hidden.bs.modal', function () {
//                         window.location.href = '/documents/add';
//                     });
//                 }
//             } else {
//                 alert('Error: ' + (data.message || 'Unknown error occurred'));
//             }
//         } catch (error) {
//             console.error('Error:', error);
//             alert('An error occurred while submitting the form.');
//         } finally {
//             $('#submitBtn').prop('disabled', false).html(isEdit ? "Update Document" : "Add Document");
//         }
//     });
// });