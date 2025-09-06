// public/js/sidebar.js
document.addEventListener("DOMContentLoaded", () => {
    // Logout
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
                    // Redirect to /login
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

    // Project link
    const projectLinks = document.querySelectorAll(".project-link");
    projectLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "/projects"; // redirect to /projects
        });
    });
});
