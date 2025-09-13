
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    try {
        const response = await fetch("/api/user/register", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Show success modal
            const successModal = new bootstrap.Modal(document.getElementById("data-success-register"));
            successModal.show();

            // Reset form & clear preview
            form.reset();
            document.getElementById("preview").innerHTML = "";
        } else {
            alert(result.message || "Something went wrong!");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Internal server error");
    }
});

// File preview
document.getElementById("uploadprofileBox").addEventListener("click", () => {
    document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (e) => {
    const preview = document.getElementById("preview");
    preview.innerHTML = "";

    const file = e.target.files[0];
    if (file) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = "100px";
        img.classList.add("img-thumbnail");
        preview.appendChild(img);
    }
});

