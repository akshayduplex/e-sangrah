document.addEventListener("DOMContentLoaded", loadSidebar);

async function loadSidebar() {
    try {
        const data = await apiFetch(`${baseUrl}/api/sidebar`);
        const recentData = await apiFetch(`${baseUrl}/api/session/recent-folders`);

        // Get icon based on item type
        const getIcon = (item) => {
            if (item.type === 'Dashboard') return 'ti ti-layout-dashboard';
            if (item.type === 'Document') return 'ti ti-files';
            if (item.type === 'File') return 'ti ti-file';
            return 'ti ti-folder-filled';
        };

        // Recursive builder for main sidebar menu
        const buildMenu = (items) => {
            return items.map(item => {
                const title = item.name || item.folderName || 'Untitled';
                const children = item.children || [];
                const hasChildren = children.length > 0;
                const iconClass = getIcon(item);

                if (hasChildren) {
                    return `
                        <li class="submenu">
                            <a href="javascript:void(0);" class="menu-link">
                                <span class="menu-arrow"></span>
                                <i class="${iconClass}"></i>
                                <span class="menuname">${title}</span>
                            </a>
                            <ul class="dropdown_wrap" style="display:none;">
                                ${buildMenu(children)}
                            </ul>
                        </li>`;
                } else {
                    let href = item.url || '#';
                    if (item.folderId && !item.url) {
                        href = `/folders/viewer/${item.folderId}`;
                    } else {
                        const trimmed = href.trim();
                        const isJsVoid = trimmed.toLowerCase() === "javascript:void(0);";
                        const isHash = trimmed.startsWith("#");
                        const isAbsolute = trimmed.startsWith("/") || trimmed.startsWith("http") || trimmed.startsWith("mailto:");
                        if (!isJsVoid && !isHash && !isAbsolute) {
                            href = trimmed.startsWith("./") ? "/" + trimmed.replace(/^\.\//, "") : "/" + trimmed;
                        }
                    }

                    return `<li>
                        <a href="${href}">
                            <i class="${iconClass}"></i> ${title}
                        </a>
                    </li>`;
                }
            }).join('');
        };

        // Recursive builder for recent folders
        const buildRecentMenu = (items) => {
            return items.map(item => {
                const title = item.folderName || item.name || 'Untitled';
                const hasChildren = item.children && item.children.length > 0;

                return `
                    <li class="recent-parent" data-folder="${item.folderId}">
                        <a href="${hasChildren ? 'javascript:void(0);' : `/folders/viewer/${item.folderId}`}" 
                           class="menu-link recent-toggle">
                            <i class="ti ti-folder-filled"></i> ${title}
                            ${hasChildren ? '<span class=""></span>' : ''}
                        </a>
                        ${hasChildren ? `
                            <ul class="dropdown_wrap recent-child" style="display:none;">
                                ${buildRecentMenu(item.children)}
                            </ul>
                        ` : ''}
                    </li>
                `;
            }).join('');
        };

        // Separate dashboard and other menu items
        const dashboardItems = data.data.filter(m => m.type === "Dashboard");
        const otherItems = data.data.filter(m => m.type !== "Dashboard");

        let menuHtml = '';

        // Build Dashboard section
        if (dashboardItems.length) {
            menuHtml += `
            <li class="submenu">
                <a href="javascript:void(0);" class="menu-link subdrop">
                    <span class="menu-arrow"></span>
                    <i class="ti ti-layout-dashboard"></i>
                    <span class="menuname">Dashboard</span>
                </a>
                <ul class="dropdown_wrap" style="display:none;">
                    ${buildMenu(dashboardItems)}
                </ul>
            </li>`;
        }

        menuHtml += buildMenu(otherItems);

        // Build Recent Folders section grouped by project
        if (recentData.success && recentData.recentFolders && recentData.recentFolders.length > 0) {
            menuHtml += recentData.recentFolders.map(project => `
                <li class="submenu">
                    <a href="javascript:void(0);" class="menu-link">
                        <span class="menu-arrow"></span>
                        <i class="ti ti-folder-filled"></i>
                        <span class="menuname">${project.projectName}</span>
                    </a>
                    <ul class="dropdown_wrap recent-folder-wrap" style="display:none;">
                        ${buildRecentMenu(project.folders)}
                    </ul>
                </li>
            `).join('');
        }

        document.getElementById("menu-list").innerHTML = menuHtml;

        // Sidebar submenu toggle (main menu)
        document.querySelectorAll(".submenu > .menu-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const submenu = link.nextElementSibling;
                if (!submenu) return;

                const isVisible = submenu.style.display === "block";

                submenu.style.display = isVisible ? "none" : "block";
                link.classList.toggle("subdrop", !isVisible);
            });
        });

        // Recent folders toggle (supports nested children)
        document.addEventListener("click", function (e) {
            const toggleLink = e.target.closest(".recent-toggle");
            if (!toggleLink) return;

            const parent = toggleLink.closest(".recent-parent");
            const submenu = parent.querySelector(":scope > .recent-child");

            if (submenu) {
                e.preventDefault();
                const isVisible = submenu.style.display === "block";

                submenu.style.display = isVisible ? "none" : "block";
                toggleLink.classList.toggle("subdrop", !isVisible);
            }
        });

    } catch (err) {
        showToast("Error loading sidebar: " + err, 'error');
    }
}
