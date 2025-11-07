$(document).ready(function () {
    const preview = $('#preview');
    const uploadIcon = $('#uploadprofileBox .upload-icon');
    /**
     * Email validation on input
     */
    $('#email').on('input', function () {
        const email = $(this).val();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailPattern.test(email)) {
            $(this).removeClass('is-invalid').addClass('is-valid');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
        }
    });

    /**
     * Phone number validation on input
     */
    $('#phone_number').on('input', function () {
        let mobile = $(this).val().replace(/\D/g, '').slice(0, 10);
        $(this).val(mobile);

        const mobilePattern = /^\d{10}$/;
        if (mobilePattern.test(mobile)) {
            $(this).removeClass('is-invalid').addClass('is-valid');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
        }
    });

    /**
     * Form submit
     */
    $('#registerForm').on('submit', async function (e) {
        e.preventDefault();

        // Basic required field check
        let isValid = true;
        $(this).find('[required]').each(function () {
            if (!$(this).val().trim()) {
                $(this).addClass('is-invalid');
                isValid = false;
            } else {
                $(this).removeClass('is-invalid').addClass('is-valid');
            }
        });

        // Email format
        const email = $('#email').val().trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            $('#email').addClass('is-invalid');
            isValid = false;
        }

        // Phone: 10 digits
        const phone = $('#phone_number').val();
        if (!/^\d{10}$/.test(phone)) {
            $('#phone_number').addClass('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            showToast('Please fill all fields correctly.', 'info');
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
                // Success
                const successModal = new bootstrap.Modal(document.getElementById('data-success-register'));
                successModal.show();

                this.reset();
                $('#preview').empty();
                $('#uploadprofileBox .upload-icon').show();
                $('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
            } else {
                // Show exact server message in toast
                const message = result.message || 'Registration failed!';
                showToast(message, 'error');

                // Optional: highlight email if duplicate
                if (message.toLowerCase().includes('email')) {
                    $('#email').addClass('is-invalid');
                }
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        }
    });
});