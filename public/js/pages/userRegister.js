$(document).ready(function () {
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

        let isValid = true;
        const requiredFields = $(this).find('[required]');

        requiredFields.each(function () {
            if (!$(this).val()) {
                isValid = false;
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid').addClass('is-valid');
            }
        });

        // Email check
        const emailInput = $('#email');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailInput.val())) {
            isValid = false;
            emailInput.addClass('is-invalid');
        }

        // Mobile check
        const mobileInput = $('#phone_number');
        const mobilePattern = /^\d{10}$/;
        if (!mobilePattern.test(mobileInput.val())) {
            isValid = false;
            mobileInput.addClass('is-invalid');
        }

        if (!isValid) {
            if (typeof showToast === 'function') {
                showToast('Please fill all required fields correctly.', 'error');
            } else {
                alert('Please fill all required fields correctly.');
            }
            return;
        }

        const form = this;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/user/register', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(err => {
                    const message = typeof err === 'string' ? err : err.msg;
                    showToast(message, 'error');
                });
                return;
            }

            if (response.ok && result.success) {
                const successModal = new bootstrap.Modal(document.getElementById('data-success-register'));
                successModal.show();

                form.reset();
                preview.empty();
                uploadIcon.show();
                $('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
            } else {
                showToast(result.error || 'Something went wrong!', 'error');
            }
        } catch (err) {
            console.error('Error:', err);
            showToast(err.message || 'Internal server error', 'error');
        }
    });
});
