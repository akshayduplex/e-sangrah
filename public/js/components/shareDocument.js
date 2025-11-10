(function ($) {
    "use strict";

    let currentDocId = null;
    let currentFileId = null;
    let customFlatpickr = null;
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

    // Open Share Modal
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

})(jQuery);