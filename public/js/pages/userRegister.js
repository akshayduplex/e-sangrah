$(document).ready(function () {

    // ------------------------------
    // DUPLICATE CHECK FUNCTION
    // ------------------------------
    function checkDuplicate(field, value, inputElement) {
        if (!value) return;

        $.ajax({
            url: `${baseUrl}/api/check`,
            method: 'GET',
            data: { [field]: value },
            success: function (res) {

                // Remove any old message
                inputElement.next(".duplicate-msg").remove();

                if (res.exists) {
                    inputElement
                        .addClass("is-invalid")
                        .removeClass("is-valid");

                    inputElement.after(
                        `<small class="duplicate-msg text-danger">${field.replace('_', ' ')} already exists</small>`
                    );
                } else {
                    inputElement
                        .addClass("is-valid")
                        .removeClass("is-invalid");
                }
            },
            error: function () {
                console.log("Error checking duplicates");
            }
        });
    }

    // ------------------------------
    // REAL-TIME VALIDATION
    // ------------------------------

    // EMAIL VALIDATION & DUPLICATE CHECK
    $('#email').on('blur input', function () {
        const email = $(this).val().trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        $(this).next(".duplicate-msg").remove();

        if (!emailPattern.test(email)) {
            $(this).addClass('is-invalid').removeClass('is-valid');
            return;
        }

        $(this).addClass('is-valid').removeClass('is-invalid');
        checkDuplicate('email', email, $(this));
    });

    // PHONE NUMBER VALIDATION & DUPLICATE CHECK
    $('#phone_number').on('blur input', function () {
        let phone = $(this).val().replace(/\D/g, '').slice(0, 10);
        $(this).val(phone);

        $(this).next(".duplicate-msg").remove();

        if (!/^\d{10}$/.test(phone)) {
            $(this).addClass('is-invalid').removeClass('is-valid');
            return;
        }

        $(this).addClass('is-valid').removeClass('is-invalid');
        checkDuplicate('phone_number', phone, $(this));
    });

    // EMPLOYEE ID VALIDATION & DUPLICATE CHECK
    $('#employee_id').on('blur input', function () {
        const emp = $(this).val().trim().toUpperCase();
        $(this).val(emp);

        $(this).next(".duplicate-msg").remove();

        if (!emp) {
            $(this).addClass('is-invalid').removeClass('is-valid');
            return;
        }

        $(this).addClass('is-valid').removeClass('is-invalid');
        checkDuplicate('employee_id', emp, $(this));
    });

    // ------------------------------
    // FORM SUBMIT
    // ------------------------------
    $('#registerForm').on('submit', async function (e) {
        e.preventDefault();

        let isValid = true;

        // Required field validation
        $(this).find('[required]').each(function () {
            if (!$(this).val().trim()) {
                $(this).addClass('is-invalid');
                isValid = false;
            } else {
                $(this).removeClass('is-invalid').addClass('is-valid');
            }
        });

        // If any duplicate exists → block submit
        if ($('.is-invalid').length > 0) {
            showToast('Please fix highlighted fields before submitting.', 'error');
            return;
        }

        const formData = new FormData(this);

        try {
            const response = await fetch(`${baseUrl}/api/user/register`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const successModal = new bootstrap.Modal(document.getElementById('data-success-register'));
                successModal.show();

                this.reset();
                $('#preview').empty();
                $('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
            } else {
                showToast(result.message || 'Registration failed!', 'error');
            }

        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        }
    });

    // ------------------------------
    // PROFILE PREVIEW
    // ------------------------------
    $('#uploadprofileBox').click(function () {
        $('#fileInput').click();
    });

    $('#fileInput').on('change', function (e) {
        const preview = $('#preview');
        preview.empty();

        const file = e.target.files[0];

        if (file) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.maxWidth = "100px";
            img.classList.add("img-thumbnail");
            preview.append(img);
        }
    });
});
