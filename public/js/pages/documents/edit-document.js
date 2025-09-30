// Simple robust initialization
function initializeEditDocument() {

    // Verify we have the required data
    if (!window.documentId || window.documentId === 'undefined' || !window.documentData) {
        console.error('Missing required data:', {
            documentId: window.documentId,
            documentData: window.documentData
        });

        // Try to get data from DOM as last resort
        const hiddenId = document.getElementById('hiddenDocumentId');
        const hiddenData = document.getElementById('hiddenDocumentData');

        if (hiddenId) window.documentId = hiddenId.value;
        if (hiddenData) {
            try {
                window.documentData = JSON.parse(decodeURIComponent(hiddenData.getAttribute('data-document')));
            } catch (e) {
                console.error('Failed to parse hidden data:', e);
            }
        }

        // Final check
        if (!window.documentId || !window.documentData) {
            showToast('Failed to load document data. Please refresh the page.', 'error');
            return;
        }
    }

    // Initialize components
    initializeBasicComponents();
    initializeFormData();
    initializeFormSubmission();
}

function initializeBasicComponents() {
    // Initialize basic UI components
    initializeSummernote();
    initializeSelect2();
    initializeDatepicker();
    initializeComplianceToggle();
    initializeMetadataModal();
    initializeSignature();

    // Set up folder management (simplified)
    $('#projectName, #department').on('change', function () {
        toggleCreateFolderBtn();
    });

    toggleCreateFolderBtn();
}

function initializeFormData() {

    // Set project
    if (window.documentData.project) {
        $('#projectName').empty().append(
            new Option(window.documentData.project.projectName, window.documentData.project._id, true, true)
        ).trigger('change');
    }

    // Set department
    if (window.documentData.department) {
        $('#department').empty().append(
            new Option(window.documentData.department.name, window.documentData.department._id, true, true)
        ).trigger('change');
    }

    // Set project manager
    if (window.documentData.projectManager) {
        $('#projectManager').empty().append(
            new Option(window.documentData.projectManager.name, window.documentData.projectManager._id, true, true)
        ).trigger('change');
    }

    // Set folder ID
    if (window.documentData.folderId) {
        $('#selectedFolderId').val(window.documentData.folderId);
    }

    // Initialize file IDs
    if (window.documentData.files && window.documentData.files.length) {
        window.uploadedFileIds = window.documentData.files.map(file => file._id);
    }
}

function initializeFormSubmission() {
    $('#documentForm').on('submit', async function (e) {
        e.preventDefault();

        // Update summernote content
        $('#summernote').val($('.summernote').summernote('code'));

        $('#submitBtn').prop('disabled', true).html(
            '<span class="spinner-border spinner-border-sm" role="status"></span> Updating...'
        );

        try {
            const formData = new FormData(this);

            // Add file IDs
            if (window.uploadedFileIds && window.uploadedFileIds.length) {
                formData.append('fileIds', JSON.stringify(window.uploadedFileIds));
            }

            const response = await fetch(`/api/documents/${window.documentId}`, {
                method: 'PATCH',
                body: formData
            });

            const data = await response.json();
            console.log('📨 Update response:', data);

            if (data.success) {

                // Show success modal or redirect
                if (data.document?.metadata?.fileName) {
                    $('#successFileName').text(data.document.metadata.fileName);
                }
                $('#data-success-modal').modal('show');

                // Redirect after modal close
                $('#data-success-modal').on('hidden.bs.modal', function () {
                    window.location.href = '/documents/list';
                });
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        } catch (error) {
            showToast(' Error updating document: ' + error.message, 'error');
        } finally {
            $('#submitBtn').prop('disabled', false).html("Update Document");
        }
    });

}

// Simple file upload for edit mode
function initializeFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadBox = document.getElementById('uploadBox');

    if (uploadBox && fileInput) {
        uploadBox.addEventListener('click', () => {
            if ($('#selectedFolderId').val()) {
                fileInput.click();
            } else {
                showToast('Please select a folder first.', 'error');
            }
        });

        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                showToast('File upload functionality needs to be implemented', 'info');
            }
        });
    }
}

// Initialize when ready
$(document).ready(function () {
    initializeEditDocument();
    initializeFileUpload();
});

// Test function for debugging
window.testEditPage = function () {
    console.log('🧪 Testing Edit Page Configuration:', {
        documentId: window.documentId,
        documentData: window.documentData,
        form: document.getElementById('documentForm'),
        projectSelect: document.getElementById('projectName')
    });

    // Test basic update
    const testData = {
        description: 'Test update - ' + new Date().toLocaleTimeString(),
        comment: 'Test from debug function'
    };

    fetch(`/api/documents/${window.documentId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Test Update Successful!');
            } else {
                alert('Test Update Failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Test Update Error:', error);
            alert('Test Update Error: ' + error.message);
        });
};