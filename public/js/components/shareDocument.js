// $(document).ready(function () {
//     const documentId = $('#documentForm').data('document-id'); // Make sure you have this in your form
//     const baseUrl = window.baseUrl
//     // --------------------------
//     // 1. Initialize User Select2
//     // --------------------------
//     $('#userInviteSelect').select2({
//         placeholder: "Search user",
//         allowClear: true,
//         ajax: {
//             url: `${baseUrl}/api/user/search`,
//             dataType: 'json',
//             delay: 250,
//             transport: function (params, success, failure) {
//                 $.ajax({
//                     url: this.url,
//                     type: "GET",
//                     data: { search: params.data.term || '' },
//                     success: function (res) { success(res); },
//                     error: failure
//                 });
//             },
//             processResults: function (data) {
//                 if (!data.success || !data.users) return { results: [] };
//                 return {
//                     results: data.users.map(u => ({ id: u._id, text: u.name }))
//                 };
//             },
//             cache: true
//         },
//         minimumInputLength: 1
//     });

//     // --------------------------
//     // 2. Invite User Button
//     // --------------------------
//     $('#inviteUserBtn').on('click', function () {
//         const userId = $('#userInviteSelect').val();
//         const accessLevel = $('#accessLevelSelect').val();

//         if (!userId) return alert('Please select a user to invite.');
//         const userName = $('#userInviteSelect option:selected').text();

//         // Append to People With Access section
//         const userRow = `
//         <div class="user-accssrow" data-user-id="${userId}">
//             <div class="empname_eml">
//                 <div class="fw-normal fs-18">${userName}</div>
//                 <small class="fs-16">${userName.toLowerCase().replace(" ", ".")}@example.com</small>
//             </div>
//             <div class="d-flex align-items-center gap-4">
//                 <div class="form-check form-switch">
//                     <label>Download Access</label>
//                     <input class="form-check-input" type="checkbox" checked>
//                 </div>
//                 <select class="form-select form-select-sm" style="width:100px;">
//                     <option ${accessLevel === 'edit' ? 'selected' : ''}>Edit</option>
//                     <option ${accessLevel === 'view' ? 'selected' : ''}>View</option>
//                 </select>
//                 <button class="btn btn-sm btn-outline-danger">Remove</button>
//             </div>
//         </div>
//         `;
//         $('.modal-body').find('.user-accssrow:last').after(userRow);

//         // Reset select
//         $('#userInviteSelect').val(null).trigger('change');
//     });

//     // --------------------------
//     // 3. Remove User Row
//     // --------------------------
//     $(document).on('click', '.user-accssrow .btn-outline-danger', function () {
//         $(this).closest('.user-accssrow').remove();
//     });

//     // --------------------------
//     // 4. Time Duration Radios
//     // --------------------------
//     $('input[name="time"]').change(function () {
//         const value = $(this).attr('id');
//         if (value === 'custom') {
//             $('#customDateWrapper').show();
//         } else {
//             $('#customDateWrapper').hide();
//             $('#startDate').val('');
//             $('#endDate').val('');
//         }
//     });

//     // --------------------------
//     // 5. General Access Dropdown
//     // --------------------------
//     $('#accessType').on('change', function () {
//         const val = $(this).val();
//         const infoText = val === 'anyone' ?
//             "Anyone on the internet with the link can view" :
//             "Only selected users can access this document";
//         $('#infoText').text(infoText);
//     });

//     // --------------------------
//     // 6. Copy Link Button
//     // --------------------------
//     $('.input-group .btn').click(function () {
//         const input = $(this).siblings('input')[0];
//         input.select();
//         input.setSelectionRange(0, 99999);
//         navigator.clipboard.writeText(input.value);
//         alert("Link copied to clipboard!");
//     });

//     // --------------------------
//     // 7. Share Button API Call
//     // --------------------------
//     $('.modal-footer .site-btnmd').click(async function () {
//         const users = [];
//         $('.user-accssrow').each(function () {
//             const userId = $(this).data('user-id');
//             const accessLevel = $(this).find('select').val().toLowerCase();
//             const downloadAccess = $(this).find('input[type="checkbox"]').is(':checked');
//             users.push({ userId, accessLevel, downloadAccess });
//         });

//         const timeRadio = $('input[name="time"]:checked').attr('id');
//         const customStart = $('#startDate').val();
//         const customEnd = $('#endDate').val();

//         try {
//             for (const u of users) {
//                 await fetch(`${baseUrl}/api/documents/${documentId}/share`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         userId: u.userId,
//                         accessLevel: u.accessLevel,
//                         duration: timeRadio,
//                         customStart: customStart || null,
//                         customEnd: customEnd || null
//                     })
//                 }).then(res => res.json()).then(data => {
//                     if (!data.success) console.error("Error sharing with user:", u.userId, data.message);
//                 });
//             }
//             alert("Document shared successfully!");
//             $('#sharedoc-modal').modal('hide');
//         } catch (err) {
//             console.error(err);
//             alert("Error sharing document. Check console for details.");
//         }
//     });
// });
