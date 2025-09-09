document.addEventListener("DOMContentLoaded", () => {

    // ----------------------
    // Logout functionality
    // ----------------------
    const logoutButtons = document.querySelectorAll(".logout-btn");
    logoutButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                const res = await fetch(`${BASE_URL}/api/auth/logout`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" }
                });
                const data = await res.json();
                if (data.success) {
                    window.location.href = "/login";
                } else {
                    alert("Logout failed: " + data.message);
                }
            } catch (err) {
                console.error(err);
                alert("Something went wrong during logout.");
            }
        });
    });

    // ----------------------
    // Project link
    // ----------------------
    const projectLinks = document.querySelectorAll(".project-link");
    projectLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "/projects";
        });
    });

    // ----------------------
    // Dynamic Sidebar Menu
    // ----------------------
    const menuList = document.getElementById('menu-list');
    if (!menuList) return;

    fetch(`${BASE_URL}/api/sidebar`)
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                menuList.innerHTML = '';
                menuList.appendChild(createMenu(response.data));
            }
        })
        .catch(err => console.error("Error fetching sidebar:", err));

    function createMenu(items) {
        const ul = document.createElement('ul');
        ul.className = 'dropdown_wrap';

        items.forEach(item => {
            if (!item.is_show) return; // hide items marked as not visible

            const li = document.createElement('li');

            const iconHTML = '<i class="ti ti-chevron-right"></i>';
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
                li.className = 'submenu';
                li.innerHTML = `
                <a href="javascript:void(0);" class="subdrop">
                    <span class="menu-arrow"></span>
                    ${iconHTML} <!-- This renders the HTML icon correctly -->
                    <span class="menuname">${item.name}</span>
                </a>
            `;
                li.appendChild(createMenu(item.children));
            } else {
                li.innerHTML = `
                <a href="${item.url || '#'}">
                    ${iconHTML} <!-- HTML string rendered as actual icon -->
                    <span class="menuname">${item.name}</span>
                </a>
            `;
            }

            ul.appendChild(li);
        });

        return ul;
    }

    // Sidebar toggle for mobile
    $('#mobile_btn').on('click', function () {
        $('#sidebar').toggleClass('show-sidebar');
    });

    // Submenu toggle
    $(document).on('click', '.submenu > a', function (e) {
        e.preventDefault();
        $(this).parent().toggleClass('subdrop');
        $(this).next('ul').slideToggle();
    });

});
