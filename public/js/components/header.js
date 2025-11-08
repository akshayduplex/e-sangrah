document.addEventListener("DOMContentLoaded", function () {
    const notificationBtn = document.querySelector("#notification_popup");
    const dropdownMenu = document.querySelector(".notification-dropdown");
    const notificationContainer = document.querySelector(".noti-content .d-flex.flex-column");
    const notificationTitle = document.querySelector(".notification-title");
    const statusDot = document.querySelector(".notification-status-dot");

    let currentPage = 1;
    const limit = 10;
    let totalPages = 1;
    let isLoading = false;
    let hasLoadedOnce = false;

    // Fetch notifications from API
    async function loadNotifications(page = 1) {
        if (isLoading || page > totalPages) return;
        isLoading = true;

        // Add temporary loader
        const loader = document.createElement("p");
        loader.textContent = "Loading...";
        loader.classList.add("text-center", "text-muted", "py-2");
        notificationContainer.appendChild(loader);

        try {
            const res = await fetch(`/api/notifications?page=${page}&limit=${limit}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();
            if (!data.success) throw new Error("Failed to fetch notifications");

            const { notifications, pagination } = data.data;
            totalPages = pagination.totalPages;
            notificationTitle.textContent = `Notifications (${pagination.total})`;

            // Remove loader
            loader.remove();

            // Show dot if any unread notifications
            const hasUnread = notifications.some(n => !n.isRead);
            statusDot.style.display = hasUnread ? "inline-block" : "none";

            // Render each notification
            notifications.forEach(n => {
                const createdTime = new Date(n.createdAt)
                    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const html = `
                    <div class="border-bottom mb-3 ${!n.isRead ? 'unread_notf' : ''}">
                        <a href="${n.actionUrl || '#'}" class="notification-link" data-id="${n._id}">
                            <div class="dflexbtwn">
                                <div class="d-flex">
                                    <span class="avatar rounded bg-light mb-2">
                                        <img src="/img/icons/fn1.png" alt="icon">
                                    </span>
                                    <div class="flex-grow-1 ms-2">
                                        <p class="mb-1">
                                            ${n.message || ''}
                                        </p>
                                        <span>${createdTime}</span>
                                    </div>
                                </div>
                                <i class="ti ti-chevron-right fs-16 notflinkarrow"></i>
                            </div>
                        </a>
                    </div>
                `;
                notificationContainer.insertAdjacentHTML("beforeend", html);
            });

            isLoading = false;
        } catch (err) {
            console.error("Error loading notifications:", err);
            loader.textContent = "Failed to load notifications.";
            isLoading = false;
        }
    }

    // Infinite scroll inside dropdown
    dropdownMenu.addEventListener("scroll", function () {
        const scrollTop = dropdownMenu.scrollTop;
        const scrollHeight = dropdownMenu.scrollHeight;
        const offsetHeight = dropdownMenu.offsetHeight;

        if (scrollTop + offsetHeight >= scrollHeight - 40) {
            if (!isLoading && currentPage < totalPages) {
                currentPage++;
                loadNotifications(currentPage);
            }
        }
    });

    // Load notifications when bell icon clicked (first time only)
    notificationBtn.addEventListener("click", function () {
        if (!hasLoadedOnce) {
            notificationContainer.innerHTML = "";
            currentPage = 1;
            loadNotifications(currentPage);
            hasLoadedOnce = true;
        }
    });

    // Mark as read on click + redirect
    document.addEventListener("click", function (e) {
        const link = e.target.closest(".notification-link");
        if (link) {
            const id = link.dataset.id;

            fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
                .catch(console.error);

            const url = link.getAttribute("href");
            if (url && url !== "#") {
                window.location.href = url;
            }
        }
    });
});
