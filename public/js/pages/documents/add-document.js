$(document).ready(function () {
    // Initialize all components
    initializeSummernote();
    initializeSelect2();
    initializeDatepicker();
    initializeComplianceToggle();
    initializeMetadataModal();
    initializeProjectSelect2();
    initializeDepartmentSelect2();
    initializeProjectManagerSelect2();
    initializeFolderManagement();
    initializeFileUpload();
    initializeSignature();
    initializeEventListeners();
    initializeFormSubmission();

    // Load initial data
    toggleCreateFolderBtn();
    loadFolders();
    updateDirectoryPath();
});

function initializeFormSubmission() {
    $('#documentForm').on('submit', async function (e) {
        e.preventDefault();
        $('#summernote').val($('.summernote').summernote('code'));

        $('#submitBtn').prop('disabled', true).html(
            '<span class="spinner-border spinner-border-sm" role="status"></span> Adding...'
        );

        try {
            const fileIdsInput = document.createElement('input');
            fileIdsInput.type = 'hidden';
            fileIdsInput.name = 'fileIds';
            fileIdsInput.value = JSON.stringify(window.uploadedFileIds || []);
            this.appendChild(fileIdsInput);

            // Clear file input
            const rawFileInput = document.getElementById('fileInput');
            if (rawFileInput) rawFileInput.value = '';

            const formData = new FormData(this);
            const response = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                if (data.document?.metadata?.fileName) {
                    $('#successFileName').text(data.document.metadata.fileName);
                }
                $('#data-success-modal').modal('show');

                $('#data-success-modal').on('hidden.bs.modal', function () {
                    window.location.href = '/documents/add';
                });
            } else {
                showToast('Error: ' + (data.message || 'Unknown error occurred'), 'error');
            }
        } catch (error) {
            showToast('An error occurred while submitting the form: ' + error, 'error');
        } finally {
            $('#submitBtn').prop('disabled', false).html("Add Document");
        }
    });
}