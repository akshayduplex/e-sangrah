$(document).ready(function () {
    window.parseNewLocationTag = function (value) {
        const prefix = 'NEW_LOC:';
        if (value && typeof value === 'string' && value.startsWith(prefix)) {
            return value.replace(prefix, '').trim();
        }
        return value;
    };
    function createSelect2Tag(params) {
        let term = $.trim(params.term);
        if (term === '') return null;

        return {
            id: 'NEW_LOC:' + term,
            text: term + ' (Add New)',
            newTag: true
        };
    }
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
    // Country Select2
    $('#country').select2({
        placeholder: "Search or add Country",
        tags: true,
        createTag: createSelect2Tag,
        allowClear: true,
        ajax: {
            url: `${baseUrl}/api/location/search`,
            dataType: 'json',
            delay: 300,
            data: function (params) {
                return {
                    type: 'country',
                    search: params.term || ''
                };
            },
            processResults: function (data) {
                return {
                    results: data.results || []
                };
            },
            cache: true
        }
    });

    // State Select2 - Depends on Country
    $('#state').select2({
        placeholder: "Search or add State",
        tags: true,
        createTag: createSelect2Tag,
        allowClear: true,
        ajax: {
            url: `${baseUrl}/api/location/search`,
            dataType: 'json',
            delay: 300,
            data: function (params) {
                return {
                    type: 'state',
                    search: params.term || '',
                    country: $('#country').val() ? parseNewLocationTag($('#country').val()) : ''
                };
            },
            processResults: function (data) {
                return {
                    results: data.results || []
                };
            },
            cache: true
        }
    });

    // City Select2 - Depends on State
    $('#city').select2({
        placeholder: "Search or add City",
        tags: true,
        createTag: createSelect2Tag,
        allowClear: true,
        ajax: {
            url: `${baseUrl}/api/location/search`,
            dataType: 'json',
            delay: 300,
            data: function (params) {
                return {
                    type: 'city',
                    search: params.term || '',
                    country: $('#country').val() ? parseNewLocationTag($('#country').val()) : '',
                    state: $('#state').val() ? parseNewLocationTag($('#state').val()) : ''
                };
            },
            processResults: function (data) {
                return {
                    results: data.results || []
                };
            },
            cache: true
        }
    });

    // Reset dependent fields when parent changes
    $('#country').on('change', function () {
        $('#state').empty().trigger('change');
        $('#city').empty().trigger('change');
    });

    $('#state').on('change', function () {
        $('#city').empty().trigger('change');
    });

    // ------------------------------
    // FORM SUBMIT
    // ------------------------------
    $('#registerForm').on('submit', async function (e) {
        e.preventDefault();

        // Normalize new location tags
        const normalize = (val) => window.parseNewLocationTag(val) || val;

        const country = normalize($('#country').val());
        const state = normalize($('#state').val());
        const city = normalize($('#city').val());

        if (!country || !state || !city) {
            showToast('Please fill Country, State, and City', 'error');
            return;
        }

        // Create location in background if it's new
        try {
            await fetch(`${baseUrl}/api/location/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country, state, city })
            });
        } catch (err) {
            console.log("Location already exists or minor issue");
        }

        const formData = new FormData(this);
        formData.set('country', country);
        formData.set('state', state);
        formData.set('city', city);

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
                $('#country, #state, #city').val(null).trigger('change');
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
