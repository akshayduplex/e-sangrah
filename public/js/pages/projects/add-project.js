document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("addProjectForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Convert donors & vendors to array objects
        data.donor = data.donors
            ? data.donors.split(",").map(name => ({ name: name.trim() }))
            : [];
        data.vendor = data.vendors
            ? data.vendors.split(",").map(name => ({ name: name.trim() }))
            : [];

        delete data.donors;
        delete data.vendors;

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                showToast("Project created successfully!", "success");
                window.location.href = "/projects"; // redirect to project list
            } else {
                const err = await res.json();
                showToast((err.message || "Failed to create project"), "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast("Something went wrong.", "error");
        }
    });
});
