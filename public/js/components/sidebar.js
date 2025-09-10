async function loadSidebar() {
    try {
        const data = await apiFetch("/api/sidebar");

        if (data.success && data.data) {
            const buildMenu = (items) => {
                return items.map(item => {
                    if (item.children && item.children.length > 0) {
                        return `
                            <li class="submenu">
                                <a href="javascript:void(0);" class="menu-link">
                                    <span class="menu-arrow"></span>
                                    ${item.icon_code || '<i class="ti ti-folder"></i>'}
                                    <span class="menuname">${item.name}</span>
                                </a>
                                <ul class="dropdown_wrap" style="display:none;">
                                    ${buildMenu(item.children)}
                                </ul>
                            </li>
                        `;
                    } else {
                        return `<li><a href="${item.url}">${item.icon_code || ''} ${item.name}</a></li>`;
                    }
                }).join('');
            };

            const dashboardItems = data.data.filter(m => m.type === "Dashboard");
            const otherItems = data.data.filter(m => m.type !== "Dashboard");

            let menuHtml = dashboardItems.length > 0
                ? `<li class="submenu">
                       <a href="javascript:void(0);" class="menu-link subdrop">
                           <span class="menu-arrow"></span>
                           <i class="ti ti-layout-dashboard"></i>
                           <span class="menuname">Dashboard</span>
                       </a>
                       <ul class="dropdown_wrap" style="display:none;">
                           ${buildMenu(dashboardItems)}
                       </ul>
                   </li>`
                : '';

            menuHtml += buildMenu(otherItems);
            document.getElementById("menu-list").innerHTML = menuHtml;

            // Toggle submenus
            document.querySelectorAll(".submenu > .menu-link").forEach(link => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    const submenu = link.nextElementSibling;
                    const isVisible = submenu.style.display === "block";
                    document.querySelectorAll(".dropdown_wrap").forEach(u => u.style.display = "none");
                    document.querySelectorAll(".menu-link.subdrop").forEach(l => l.classList.remove("subdrop"));
                    submenu.style.display = isVisible ? "none" : "block";
                    if (!isVisible) link.classList.add("subdrop");
                });
            });
        }
    } catch (err) {
        console.error("Error loading sidebar:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadSidebar);
