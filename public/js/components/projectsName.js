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
