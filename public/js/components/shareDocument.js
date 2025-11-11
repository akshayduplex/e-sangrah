(function ($) {
    "use strict";

    let currentDocId = null;
    let currentFileId = null;
    let customFlatpickr = null;
    let restoreTarget = {};
    const baseUrl = window.location.origin;

    // Initialize Flatpickr only once
    function initFlatpickr() {
        if (!customFlatpickr && document.getElementById('flatpickr-range')) {
            customFlatpickr = flatpickr("#flatpickr-range", {
                mode: "range",
                dateFormat: "Y-m-d",
                conjunction: " to "
            });
        }
    }

    // Load users for invite dropdown
    function loadUsersForInvite($select) {
        $.ajax({
            url: `${baseUrl}/api/user`,
            method: 'GET',
            success: function (response) {
                $select.empty().append('<option value="">Search user...</option>');
                if (response.data && response.data.length) {
                    response.data.forEach(user => {
                        $select.append(`<option value="${user.email}">${user.name} (${user.email})</option>`);
                    });
                }
            },
            error: function () {
                console.error('Failed to load users for invite');
            }
        });
    }

    // -------------------------
    // Open Share Modal
    // -------------------------
    $(document).on('show.bs.modal', '#sharedoc-modal', function (event) {
        const button = $(event.relatedTarget);
        currentDocId = button.data('doc-id');
        currentFileId = button.data('file-id');
        const modal = $(this);

        // Reset modal state
        modal.find('#userInviteSelect').val('');
        modal.find('#accessLevelSelect').val('view');
        modal.find('input[name="time"]').prop('checked', false);
        modal.find('#customDateWrapper').hide();
        modal.find('#usersWithAccessContainer').empty();
        modal.find('#sharelink').val('');
        modal.find('#accessType').val('anyone');
        modal.find('#roleType').val('viewer');
        modal.find('#infoText').text('Anyone on the internet with the link can view');

        if (!currentDocId || !currentFileId) {
            showToast('Invalid document or file', 'error');
            modal.modal('hide');
            return;
        }

        initFlatpickr();

        // Load Share Link
        $.get(`${baseUrl}/api/documents/${currentDocId}/${currentFileId}/share-link`)
            .done(res => {
                if (res.success && res.link) {
                    modal.find('#sharelink').val(res.link);
                }
            })
            .fail(() => showToast('Failed to load share link', 'warning'));

        // Load Shared Users
        $.get(`${baseUrl}/api/documents/${currentDocId}/shared-users`)
            .done(res => {
                const container = modal.find('#usersWithAccessContainer');
                container.empty();
                if (!res.success || !Array.isArray(res.data)) {
                    container.append('<div class="text-muted">No users found.</div>');
                    return;
                }

                let rows = '';
                res.data.forEach(user => {
                    const isOwner = user.accessLevel === 'owner';
                    const checkboxId = `download-${user.userId}`;
                    rows += `
                        <div class="user-accssrow dynamic d-flex justify-content-between align-items-center mb-2 p-2">
                            <div class="empname_eml flex-grow-1">
                                <div class="fw-normal">${user.name}</div>
                                <small class="text-muted">${user.email}</small>
                                ${user.inviteStatus === 'pending' ? '<span class="badge bg-warning ms-2">Pending</span>' : ''}
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                ${!isOwner ? `
                                    <div class="form-check form-switch me-2">
                                        <input class="form-check-input download-access" type="checkbox" id="${checkboxId}"
                                            data-user-id="${user.userId}" ${user.canDownload ? 'checked' : ''}>
                                        <label class="form-check-label" for="${checkboxId}">Download</label>
                                    </div>
                                    <select class="form-select form-select-sm access-level" data-user-id="${user.userId}">
                                        <option value="edit" ${user.accessLevel === 'edit' ? 'selected' : ''}>Edit</option>
                                        <option value="view" ${user.accessLevel === 'view' ? 'selected' : ''}>View</option>
                                    </select>
                                    <button class="btn btn-sm remvaccessbtn remove-user" data-user-id="${user.userId}">Remove</button>
                                ` : `<div class="fw-bold text-primary">Owner</div>`}
                            </div>
                        </div>`;
                });
                container.html(rows);
            })
            .fail(() => {
                modal.find('#usersWithAccessContainer').html('<div class="text-danger">Failed to load users.</div>');
            });

        // Load invite users
        loadUsersForInvite(modal.find('#userInviteSelect'));
    });

    // Custom Date Visibility
    $(document).on('change', '#sharedoc-modal input[name="time"]', function () {
        const isCustom = this.id === 'custom';
        $('#customDateWrapper').toggle(isCustom);
        if (isCustom && !customFlatpickr) initFlatpickr();
    });

    // Access Type & Role Info Text
    $(document).on('change', '#sharedoc-modal #accessType, #sharedoc-modal #roleType', function () {
        const accessType = $('#accessType').val();
        const roleType = $('#roleType').val();
        const infoText = $('#infoText');

        if (accessType === 'anyone') {
            infoText.text(roleType === 'viewer'
                ? 'Anyone on the internet with the link can view'
                : 'Anyone on the internet with the link can edit');
        } else {
            infoText.text('Only people with access can view');
        }
    });

    // Invite User
    $(document).on('click', '#inviteUserBtn', function () {
        const $btn = $(this).prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');
        const userEmail = $('#userInviteSelect').val();
        const accessLevel = $('#accessLevelSelect').val();
        const duration = $('input[name="time"]:checked').attr('id');
        let customStart = null, customEnd = null;

        if (duration === 'custom' && customFlatpickr?.selectedDates.length === 2) {
            customStart = customFlatpickr.selectedDates[0].toISOString();
            customEnd = customFlatpickr.selectedDates[1].toISOString();
        }

        if (!userEmail || !$('input[name="time"]:checked').length || (duration === 'custom' && (!customStart || !customEnd))) {
            showToast('Please fill all required fields', 'info');
            $btn.prop('disabled', false).html('Invite');
            return;
        }

        const data = { userEmail, accessLevel, duration };
        if (duration === 'custom') {
            data.customStart = customStart;
            data.customEnd = customEnd;
        }

        $.ajax({
            url: `${baseUrl}/api/documents/${currentDocId}/invite`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: () => {
                showToast('Invitation sent!', 'success');
                $('#sharedoc-modal').modal('hide');
            },
            error: (err) => {
                showToast(err.responseJSON?.message || 'Failed to send invite', 'error');
            },
            complete: () => $btn.prop('disabled', false).html('Invite')
        });
    });

    // Remove User Access
    $(document).on('click', '#sharedoc-modal .remove-user', function () {
        const userId = $(this).data('user-id');
        const $row = $(this).closest('.user-accssrow');

        if (confirm('Remove this user\'s access?')) {
            $.ajax({
                url: `${baseUrl}/api/documents/share/${currentDocId}`,
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ userId }),
                success: () => {
                    $row.remove();
                    showToast('Access removed', 'success');
                },
                error: () => showToast('Failed to remove access', 'error')
            });
        }
    });

    // Update Permissions (Done button)
    $(document).on('click', '#sharedoc-modal #shareBtn', function () {
        const users = $('#usersWithAccessContainer .user-accssrow').map(function () {
            const userId = $(this).find('.access-level').data('user-id');
            if (!userId) return null;
            return {
                userId,
                accessLevel: $(this).find('.access-level').val(),
                canDownload: $(this).find('.download-access').is(':checked')
            };
        }).get().filter(Boolean);

        const generalAccess = $('#accessType').val() === 'anyone';
        const generalRole = $('#roleType').val();

        if (users.length === 0 && !generalAccess) {
            showToast('Add at least one user or enable public access', 'info');
            return;
        }

        $.ajax({
            url: `${baseUrl}/api/documents/${currentDocId}/permissions`,
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ users, generalAccess, generalRole }),
            success: (res) => {
                showToast(res.message || 'Permissions updated!', 'success');
                $('#sharedoc-modal').modal('hide');
            },
            error: (err) => showToast(err.responseJSON?.message || 'Update failed', 'error')
        });
    });

    // Copy Link
    $(document).on('click', '#copyLinkBtn', function () {
        const link = $('#sharelink').val();
        if (!link) return showToast('No link to copy', 'info');

        navigator.clipboard.writeText(link).then(() => {
            showToast('Link copied!', 'success');
        }).catch(() => {
            const temp = document.createElement('textarea');
            temp.value = link;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('Link copied!', 'success');
        });
    });

    // -------------------------
    // Archive Document
    // -------------------------
    $(document).on('click', '.archive-document', function (e) {
        e.preventDefault();
        const docId = $(this).data('id');
        const docName = $(this).closest('tr').find('td:nth-child(2) p').text().trim() || 'this document';

        $('#archivedoc-modal .modal-body').text(`Are you sure you want to archive "${docName}"?`);
        $('#archivedoc-modal .modal-title').html(`<img src="/img/icons/archvbin.png" alt="Archive" class="me-2"> Move to Archive`);
        $('#archivedoc-modal').modal('show');

        $('#archivedoc-modal .btn-primary').off('click').on('click', function () {
            $.ajax({
                url: `${baseUrl}/api/documents/${docId}/archive?isArchived=true`,
                method: 'PATCH',
                success: function (res) {
                    $('#archivedoc-modal').modal('hide');
                    if (typeof table !== 'undefined') table.ajax.reload(null, false);
                    showToast(res.message || 'Document archived!', 'success');
                },
                error: function (err) {
                    showToast(err.responseJSON?.message || 'Failed to archive', 'error');
                }
            });
        });
    });

    // -------------------------
    // Trash (Delete) Document
    // -------------------------
    $(document).on('click', '.btn-delete', function (e) {
        e.preventDefault();
        const docId = $(this).data('id');
        $('#trashdoc-modal').modal('show');

        $('#confirm-trash-folder').off('click').on('click', function () {
            $.ajax({
                url: `${baseUrl}/api/documents/${docId}`,
                method: 'DELETE',
                success: function (res) {
                    $('#trashdoc-modal').modal('hide');
                    if (typeof table !== 'undefined') table.ajax.reload();
                    showToast(res.message || 'Document moved to trash!', 'success');
                },
                error: function (err) {
                    showToast(err.responseJSON?.message || 'Failed to delete', 'error');
                }
            });
        });
    });
    document.addEventListener('DOMContentLoaded', function () {
        function loadVersionHistory(docId) {
            const versionList = document.querySelector('#versionhistory-modal .version-list');
            if (!versionList) return;

            versionList.innerHTML = '<p class="text-center">Loading...</p>';

            fetch(`/api/documents/${docId}/versions/history`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(res => {
                    if (!res.success || !res.data?.versionHistory) {
                        versionList.innerHTML = '<p class="text-danger">No version history found.</p>';
                        return;
                    }

                    versionList.innerHTML = '';
                    res.data.versionHistory.forEach(item => {
                        const modifiedDate = new Date(item.timestamp).toLocaleString();
                        const restoreButton = item.version !== "1.0"
                            ? `<button class="btn btn-outline-light rounded-pill btn-restore-version" 
                                 data-version="${item.version}" 
                                 data-previous-version="${item.previousVersion}">
                                 Restore to v${item.previousVersion}
                               </button>`
                            : '';

                        const html = `
                        <div class="version-item border-bottom pb-3 mb-3">
                            <div class="dflexbtwn align-items-start">
                                <div class="flxtblleft">
                                    <span class="avatar rounded bg-light mb-2">
                                        <img src="${item.changedBy?.avatar || '/img/icons/fn2.png'}" alt="User">
                                    </span>
                                    <div class="flxtbltxt">
                                        <p class="fs-18 mb-1 fw-normal">
                                            ${res.data.documentName} v${item.version}
                                            ${item.isCurrent ? '<span class="badge bg-success ms-2">Current</span>' : ''}
                                        </p>
                                        <span class="fs-16 fw-normal d-block mb-2">
                                            Modified by ${item.changedBy?.name || 'Unknown'}
                                        </span>
                                        <h5 class="fs-18 fw-light text-black mb-3">
                                            ${item.changes || 'Updated document'}
                                        </h5>
                                        <div class="version-actions">
                                            <button class="site-btnmd fw-light btn-view-version" data-version="${item.version}">
                                                View
                                            </button>
                                            ${restoreButton}
                                        </div>
                                    </div>
                                </div>
                                <p class="text-muted">Modified on ${modifiedDate}</p>
                            </div>
                        </div>`;
                        versionList.insertAdjacentHTML('beforeend', html);
                    });
                })
                .catch(error => {
                    console.error('Error loading version history:', error);
                    versionList.innerHTML = '<p class="text-danger">Failed to load version history.</p>';
                });
        }
        const shareModal = document.getElementById('sharedoc-modal');
        const versionModal = document.getElementById('versionhistory-modal');

        if (shareModal) {
            shareModal.addEventListener('show.bs.modal', function (event) {
                const button = event.relatedTarget;
                const $button = $(button);
                currentDocId = $button.data('doc-id');
                currentFileId = $button.data('file-id');

                if (!currentDocId || !currentFileId) {
                    console.warn('Missing docId or fileId for share modal');
                    return;
                }

                // Your existing share modal logic here...
                // (Keep all the $.get, loadUsersForInvite, etc.)
            });
        }

        if (versionModal) {
            versionModal.addEventListener('show.bs.modal', function (event) {
                const button = event.relatedTarget;
                const dropdownItem = button.closest('.dropdown-item');
                const docId = dropdownItem?.getAttribute('data-id');

                if (!docId) {
                    console.error('No document ID for version history');
                    return;
                }

                currentDocId = docId;
                loadVersionHistory(docId);
            });
        }
    });
    // Handle View Version button
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-view-version')) {
            const version = e.target.getAttribute('data-version');
            if (!currentDocId || !version) return;

            // Open the version view page
            window.location.href = `/documents/${currentDocId}/versions/view?version=${version}`;
        }
    });


    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-restore-version')) {
            const version = e.target.getAttribute('data-version');
            const previousVersion = e.target.getAttribute('data-previous-version');
            if (!currentDocId || !previousVersion) return;

            restoreTarget = { docId: currentDocId, version: previousVersion };

            // Update modal title and body dynamically
            const restoreModal = document.getElementById('restore-folder-modal');
            if (restoreModal) {
                const modalTitle = restoreModal.querySelector('.modal-title');
                const modalBody = restoreModal.querySelector('.modal-body');

                modalTitle.innerHTML = `
                <img src="/img/icons/restore.png" alt="Restore Icon" width="32" class="me-2">
                Restore Version
            `;
                modalBody.textContent = `Are you sure you want to restore this document to version ${previousVersion}?`;

                // Show the modal
                const bsModal = new bootstrap.Modal(restoreModal);
                bsModal.show();
            }
        }
    });

    // Confirm restore action
    document.getElementById('confirm-restore-folder')?.addEventListener('click', function () {
        if (!restoreTarget.docId || !restoreTarget.version) return;

        fetch(`/api/documents/${restoreTarget.docId}/versions/${restoreTarget.version}/restore`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(res => {
                showToast(res.message || `Restored to version ${restoreTarget.version}`, 'success');

                // Hide modal
                const restoreModal = document.getElementById('restore-folder-modal');
                if (restoreModal) {
                    const bsModal = bootstrap.Modal.getInstance(restoreModal);
                    bsModal.hide();
                }

                // Reload documents
                loadDocuments();
            })
            .catch(error => {
                console.error('Error restoring version:', error);
                showToast('Failed to restore version', 'error');
            });
    });

    // Search functionality for versions
    document.getElementById('versionSearch')?.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const versionItems = document.querySelectorAll('#versionhistory-modal .version-item');

        versionItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

})(jQuery);