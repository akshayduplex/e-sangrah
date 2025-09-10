// Global AJAX setup
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        console.log('Request URL:', settings.url);
    },
    complete: function (xhr, status) {
        console.log('Request completed with status:', status);
    },
    timeout: 10000 // optional timeout
});
