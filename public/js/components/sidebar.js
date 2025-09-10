// document.addEventListener("DOMContentLoaded", () => {

//     // ----------------------
//     // Logout functionality
//     // ----------------------
//     const logoutButtons = document.querySelectorAll(".logout-btn");
//     logoutButtons.forEach(btn => {
//         btn.addEventListener("click", async (e) => {
//             e.preventDefault();
//             try {
//                 const res = await fetch(`${BASE_URL}/api/auth/logout`, {
//                     method: "POST",
//                     credentials: "same-origin",
//                     headers: { "Content-Type": "application/json" }
//                 });
//                 const data = await res.json();
//                 if (data.success) {
//                     window.location.href = "/login";
//                 } else {
//                     alert("Logout failed: " + data.message);
//                 }
//             } catch (err) {
//                 console.error(err);
//                 alert("Something went wrong during logout.");
//             }
//         });
//     });

//     // ----------------------
//     // Project link
//     // ----------------------
//     const projectLinks = document.querySelectorAll(".project-link");
//     projectLinks.forEach(link => {
//         link.addEventListener("click", (e) => {
//             e.preventDefault();
//             window.location.href = "/projects";
//         });
//     });

//     // ----------------------
//     // Dynamic Sidebar Menu
//     // ----------------------
//     const menuList = document.getElementById('menu-list');
//     if (!menuList) return;

//     fetch(`${BASE_URL}/api/sidebar`)
//         .then(res => res.json())
//         .then(response => {
//             if (response.success) {
//                 menuList.innerHTML = '';
//                 menuList.appendChild(createMenu(response.data));
//             }
//         })
//         .catch(err => console.error("Error fetching sidebar:", err));

//     function createMenu(items) {
//         const ul = document.createElement('ul');
//         ul.className = 'dropdown_wrap';

//         items.forEach(item => {
//             if (!item.is_show) return; // hide items marked as not visible

//             const li = document.createElement('li');
//             const hasChildren = item.children && item.children.length > 0;

//             if (hasChildren) {
//                 li.className = 'submenu';
//                 li.innerHTML = `
//                 <a href="javascript:void(0);" class="subdrop">
//                     <span class="menu-arrow"></span>
//                     <span class="menuname">${item.name}</span>
//                 </a>
//             `;
//                 li.appendChild(createMenu(item.children));
//             } else {
//                 li.innerHTML = `
//                 <a href="${item.url || '#'}">
//                     <span class="menuname">${item.name}</span>
//                 </a>
//             `;
//             }

//             ul.appendChild(li);
//         });

//         return ul;
//     }

//     // Sidebar toggle for mobile
//     $('#mobile_btn').on('click', function () {
//         $('#sidebar').toggleClass('show-sidebar');
//     });

//     // Submenu toggle
//     $(document).on('click', '.submenu > a', function (e) {
//         e.preventDefault();
//         $(this).parent().toggleClass('subdrop');
//         $(this).next('ul').slideToggle();
//     });

// });

$(document).ready(function () {
    $.getJSON("http://localhost:5000/api/sidebar", function (response) {
        if (response.success && response.data) {
            console.log(response.data);
            // Recursive function for nested menus
            function buildMenu(items) {
                let html = "";
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        html += `
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
                        html += `
                            <li>
                                <a href="${item.url}">
                                    <i class="ti ti-chevron-right"></i>
                                    ${item.icon_code || ''} ${item.name}
                                </a>
                            </li>
                        `;
                    }
                });
                return html;
            }

            // Separate dashboard-type menus
            let dashboardItems = response.data.filter(m => m.type === "Dashboard");
            let otherItems = response.data.filter(m => m.type !== "Dashboard");

            let menuHtml = "";

            // If we have dashboard menus, show them under one "Dashboard" root
            if (dashboardItems.length > 0) {
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
                    </li>
                `;
            }

            // Render other Masters / Menus
            menuHtml += buildMenu(otherItems);

            // Inject into sidebar
            $("#menu-list").html(menuHtml);

            // Toggle submenus
            $(document).on("click", ".submenu > .menu-link", function (e) {
                e.preventDefault();
                const $submenu = $(this).next(".dropdown_wrap");

                if ($submenu.is(":visible")) {
                    $submenu.slideUp(200);
                    $(this).removeClass("subdrop");
                } else {
                    // close siblings
                    $(this).closest("ul").find(".dropdown_wrap:visible").slideUp(200);
                    $(this).closest("ul").find(".menu-link.subdrop").removeClass("subdrop");

                    $submenu.slideDown(200);
                    $(this).addClass("subdrop");
                }
            });
        }
    });
});