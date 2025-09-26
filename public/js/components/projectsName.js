// public/js/global.js
(function ($) {
    $(document).ready(function () {
        const STORAGE_KEY = 'selectedProject';
        const $select = $('#selectHeaderProject');
        if (!$select.length) return;

        // Initialize Select2
        $select.select2({
            placeholder: 'Select project',
            allowClear: false,
            width: 'resolve',
            ajax: {
                transport: function (params, success, failure) {
                    const search = params.data.term || '';
                    const url = `/api/projects?search=${encodeURIComponent(search)}&limit=10`;
                    fetch(url, { credentials: 'include' })
                        .then(r => r.json())
                        .then(json => {
                            let items = [];
                            if (Array.isArray(json.data)) items = json.data;
                            else if (Array.isArray(json.results)) items = json.results;
                            else if (Array.isArray(json)) items = json;
                            else if (json.data && Array.isArray(json.data.data)) items = json.data.data;
                            success(items);
                        })
                        .catch(err => {
                            console.error("Project select load error:", err);
                            failure(err);
                        });
                },
                processResults: function (response) {
                    const projects = Array.isArray(response) ? response : (response.data || []);
                    return {
                        results: (projects || []).map(p => ({
                            id: p._id,
                            text: p.projectName || p.name || 'Untitled'
                        }))
                    };
                },
                cache: true
            },
            minimumInputLength: 0
        });

        // Load first 10 projects initially
        (async function loadInitialProjects() {
            try {
                const savedValue = localStorage.getItem(STORAGE_KEY);

                // Fetch first 10 projects
                const res = await fetch('/api/projects?limit=10', { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch projects');
                const json = await res.json();
                let items = [];
                if (Array.isArray(json.data)) items = json.data;
                else if (Array.isArray(json.results)) items = json.results;
                else if (Array.isArray(json)) items = json;
                else if (json.data && Array.isArray(json.data.data)) items = json.data.data;

                const opts = (items || []).slice(0, 10).map(p => new Option(p.projectName || p.name || 'Untitled', p._id, false, false));
                if (opts.length) $select.append(opts);

                // If saved value exists, fetch it specifically to display
                if (savedValue && !$select.find(`option[value="${savedValue}"]`).length) {
                    const res2 = await fetch(`/api/projects/${savedValue}`, { credentials: 'include' });
                    if (res2.ok) {
                        const project = await res2.json();
                        let projItem;
                        if (project.data) projItem = project.data;
                        else projItem = project;

                        const opt = new Option(projItem.projectName || projItem.name || 'Untitled', projItem._id, false, true);
                        $select.append(opt).trigger('change');
                    }
                } else if (savedValue) {
                    $select.val(savedValue).trigger('change');
                }
            } catch (err) {
                console.warn('Could not load initial projects for #projectSelect:', err.message);
            }
        })();

        // Save selected value to localStorage whenever it changes
        $select.on('change', function () {
            const val = $(this).val();
            if (val) localStorage.setItem(STORAGE_KEY, val);
            else localStorage.removeItem(STORAGE_KEY); // if cleared
        });
    });
})(jQuery);


// (function ($) {
//     $(document).ready(function () {
//         const STORAGE_KEY = 'selectedProject';
//         const LIMIT_KEY = 'projectLimit'; // allow saving user preferred limit
//         const $select = $('#selectHeaderProject');

//         if (!$select.length) return;

//         console.log('Initializing project selector...');

//         // Default limit or saved preference
//         let dynamicLimit = parseInt(localStorage.getItem(LIMIT_KEY), 10) || 10;

//         // Initialize Select2
//         $select.select2({
//             placeholder: 'Select project',
//             allowClear: true,
//             width: 'resolve',
//             ajax: {
//                 url: '/api/projects',
//                 dataType: 'json',
//                 delay: 250,
//                 data: function (params) {
//                     return {
//                         search: params.term || '',
//                         page: params.page || 1,
//                         limit: dynamicLimit
//                     };
//                 },
//                 processResults: function (response, params) {
//                     let projects = [];

//                     if (response && response.success && Array.isArray(response.data)) {
//                         projects = response.data;
//                     }

//                     return {
//                         results: projects.map(project => ({
//                             id: project._id || project.id,
//                             text: project.projectName || project.name || 'Untitled Project'
//                         })),
//                         pagination: {
//                             more: projects.length === dynamicLimit // enable pagination if more results
//                         }
//                     };
//                 },
//                 cache: true
//             },
//             minimumInputLength: 0
//         });

//         // Load initial projects
//         loadInitialProjects();

//         async function loadInitialProjects() {
//             try {
//                 const savedValue = localStorage.getItem(STORAGE_KEY);

//                 const response = await fetch(`/api/projects?limit=${dynamicLimit}`, {
//                     credentials: 'include'
//                 });
//                 if (!response.ok) throw new Error(`HTTP ${response.status}`);

//                 const data = await response.json();
//                 let projects = [];

//                 if (data && data.success && Array.isArray(data.data)) {
//                     projects = data.data;
//                 }

//                 $select.empty();
//                 $select.append(new Option('Select project', '', true, true));

//                 projects.forEach(project => {
//                     const option = new Option(
//                         project.projectName || project.name || 'Untitled',
//                         project._id || project.id,
//                         false,
//                         false
//                     );
//                     $select.append(option);
//                 });

//                 // Restore saved project
//                 if (savedValue && projects.some(p => (p._id || p.id) === savedValue)) {
//                     $select.val(savedValue).trigger('change');
//                     console.log('Restored saved project:', savedValue);
//                 }

//             } catch (err) {
//                 console.error('Error loading initial projects:', err);
//                 $select.empty();
//                 $select.append(new Option('Select project', '', true, true));
//                 $select.append(new Option('No projects available', 'no-projects', false, false));
//             }
//         }

//         // Save selected project and show it
//         $select.on('change', async function () {
//             const val = $(this).val();
//             if (val && val !== 'error') {
//                 localStorage.setItem(STORAGE_KEY, val);
//                 console.log('Saved project selection:', val);

//                 // Fetch project details and show
//                 try {
//                     const res = await fetch(`/api/projects/${val}`, { credentials: 'include' });
//                     if (res.ok) {
//                         const project = await res.json();
//                         console.log('Selected project details:', project);

//                         // Example: show in a div
//                         $('#selectedProjectDetails').text(
//                             `Project: ${project.projectName || project.name}`
//                         );
//                     }
//                 } catch (err) {
//                     console.error('Error fetching project details:', err);
//                 }

//             } else {
//                 localStorage.removeItem(STORAGE_KEY);
//                 $('#selectedProjectDetails').empty();
//             }
//         });

//         // Allow user to change the "limit" dynamically
//         $('#changeProjectLimit').on('change', function () {
//             dynamicLimit = parseInt($(this).val(), 10) || 10;
//             localStorage.setItem(LIMIT_KEY, dynamicLimit);
//             console.log('Updated project limit to:', dynamicLimit);

//             // Reload projects
//             loadInitialProjects();
//         });

//         console.log('Project selector initialization complete');
//     });
// })(jQuery);
