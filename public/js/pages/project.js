document.addEventListener("DOMContentLoaded", () => {
    const projectsContainer = document.getElementById("projectsContainer");
    const searchInput = document.getElementById("projectSearch");
    const loader = document.getElementById("loader");

    let currentPage = 1;
    let currentQuery = '';
    let totalPages = 1;
    let isLoading = false;

    async function fetchProjects(page = 1, query = '', append = false) {
        if (isLoading) return; // prevent duplicate requests
        if (page > totalPages) return; // no more pages

        isLoading = true;
        loader.style.display = 'block';

        try {
            const response = await fetch(
                `http://localhost:5000/api/projects/search?q=${encodeURIComponent(query)}&page=${page}&limit=10`,
                { credentials: 'include' }
            );

            const data = await response.json();

            if (data.success && data.count > 0) {
                totalPages = data.pagination.totalPages;
                renderProjects(data.data, append);
            } else if (!append) {
                projectsContainer.innerHTML = '<p>No projects found.</p>';
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
            if (!append) projectsContainer.innerHTML = '<p>Error loading projects.</p>';
        } finally {
            isLoading = false;
            loader.style.display = 'none';
        }
    }

    function renderProjects(projects, append = false) {
        if (!append) projectsContainer.innerHTML = '';

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-sm-3 d-flex';
            card.innerHTML = `
                <div class="card projectcard position-relative w-100">
                    <div class="card-body pjcrdbody">
                        <h5 class="fs-20 fw-normal mb-2">${project.projectName ?? 'Unnamed Project'}</h5>
                        <a href="/projects/${project._id}/project-details" 
                           class="position-absolute top-0 end-0 mt-2 me-4 text-primary fs-12 fw-light text-decoration-none">
                           View
                        </a>
                        <h6 class="fs-16 fw-normal text-neutral">
                            Department: ${project.department?.name ?? 'N/A'}
                        </h6>
                        <small class="fs-12 text-black fw-light">
                            Created on: ${new Date(project.createdAt ?? project.projectStartDate).toLocaleDateString()}
                        </small>
                        <h6 class="fs-16 fw-normal mt-2 text-neutral">
                            ${project.projectManager?.name ?? 'Unassigned'}
                        </h6>
                        <small class="fs-12 fw-light">Status: ${project.projectStatus ?? 'Unknown'}</small>

                        <div class="prjtxt mt-3">
                            <p class="fs-12 fw-light">${project.projectDescription ?? ''}</p>
                            <div class="dflexbtwn">
                                <a href="project-files.php?id=${project._id}" class="site-btnmd fw-light fs-12">Access Files</a>
                                <span>${project.tags?.length ?? 0} Tags</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            projectsContainer.appendChild(card);
        });
    }

    // Infinite scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
            if (!isLoading && currentPage < totalPages) {
                currentPage++;
                fetchProjects(currentPage, currentQuery, true);
            }
        }
    });

    // Debounce function
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const handleSearch = debounce(() => {
        currentQuery = searchInput.value.trim();
        if (currentQuery.length < 2) {
            projectsContainer.innerHTML = '<p>Type at least 2 characters to search.</p>';
            return;
        }

        currentPage = 1;
        totalPages = 1;
        fetchProjects(currentPage, currentQuery, false);
    }, 400);

    searchInput.addEventListener("input", handleSearch);


    // Initial load
    fetchProjects();
});
