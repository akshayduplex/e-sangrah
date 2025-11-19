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

    // ---------------------------------------------------------
    // RENDER NOTIFICATIONS (UPDATED WITH approval_request LOGIC)
    // ---------------------------------------------------------
    function renderNotifications(notifications) {
        notifications.forEach(n => {

            const createdTime = new Date(n.createdAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            });

            // 🎯 NEW: HANDLE APPROVAL REQUEST
            let actionUrl = n.actionUrl || "#";
            let displayButton = ""; // for Approve button

            if (n.type === "approval_request") {
                actionUrl = "/approval-requests";
                displayButton = `
                    <span class="badge bg-success text-white px-2 py-1 ms-2">
                        Approve
                    </span>
                `;
            }

            // For document_approved → Track page
            else if (n.type === "document_approved") {
                actionUrl = `/document/${n.documentId}/approval/track`;
            }

            // For document → Document List
            else if (n.type === "document") {
                actionUrl = "/documents/list";
            }

            // For approval_update → Employee approval page
            else if (n.type === "approval_update") {
                actionUrl = "/employee/approval";
            }

            const html = `
                <div class="border-bottom mb-3 ${!n.isRead ? 'unread_notf' : ''}">
                    <a href="${actionUrl}" class="notification-link" data-id="${n._id}">
                        <div class="dflexbtwn">
                            <div class="d-flex">
                                <span class="avatar rounded bg-light mb-2">
                                    <img src="/img/icons/fn1.png" alt="icon">
                                </span>
                                <div class="flex-grow-1 ms-2">
                                    <p class="mb-1">
                                        <span class="text-dark fw-semibold">${n.sender.name}</span>
                                        ${n.message.replace(n.sender.name, '')}
                                        ${displayButton}   <!-- ⭐ Button only for approval_request -->
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
    }

    // ---------------------------------------------------------
    // LOAD NOTIFICATIONS
    // ---------------------------------------------------------
    async function loadNotifications(page = 1) {
        if (isLoading || page > totalPages) return;
        isLoading = true;

        const loader = document.createElement("p");
        loader.textContent = "Loading...";
        loader.classList.add("text-center", "text-muted", "py-2");
        notificationContainer.appendChild(loader);

        try {
            const res = await fetch(`/api/notifications?page=${page}&limit=${limit}`);
            const data = await res.json();
            if (!data.success) throw new Error("Failed to fetch notifications");

            const { notifications, page: current, totalPages: total, totalUnread } = data.data;
            totalPages = total;

            notificationTitle.textContent = `Notifications (${totalUnread})`;

            statusDot.style.display = totalUnread > 0 ? "inline-block" : "none";

            loader.remove();

            renderNotifications(notifications);
        } catch (err) {
            console.error(err);
            loader.textContent = "Failed to load notifications.";
        } finally {
            isLoading = false;
        }
    }

    // Infinite scroll
    dropdownMenu.addEventListener("scroll", function () {
        const scrollTop = dropdownMenu.scrollTop;
        const scrollHeight = dropdownMenu.scrollHeight;
        const offsetHeight = dropdownMenu.offsetHeight;

        if (scrollTop + offsetHeight >= scrollHeight - 40 && currentPage < totalPages) {
            currentPage++;
            loadNotifications(currentPage);
        }
    });

    // Load notifications when opening dropdown
    notificationBtn.addEventListener("click", function () {
        if (!hasLoadedOnce) {
            notificationContainer.innerHTML = "";
            currentPage = 1;
            loadNotifications(currentPage);
            hasLoadedOnce = true;
        }
    });

    // MARK AS READ + REDIRECT
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
