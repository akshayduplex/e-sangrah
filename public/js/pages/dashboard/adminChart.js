// public/js/dashboard.js

$(document).ready(function () {
    // Check if the #department element exists
    if ($('#department').length > 0) {
        // API URL
        const apiUrl = "/api/dashboard/uploads?projectId=68ca6408c800c22c9a8f485a&period=month";

        // Fetch data using jQuery AJAX
        $.ajax({
            url: apiUrl,
            method: "GET",
            dataType: "json",
            success: function (result) {
                if (result.success && result.data && result.data.departmentUploads) {
                    const departments = result.data.departmentUploads;

                    // Extract data for chart
                    const labels = departments.map(dep => dep.departmentName);
                    const dataValues = departments.map(dep => dep.percentage);

                    // Define background colors
                    const backgroundColors = [
                        '#10A37F', '#33A3D2', '#F15C44', '#2B1871',
                        '#8A38F5', '#8A4167', '#E8B730', '#24A19C'
                    ];

                    // Create the doughnut chart
                    const ctx = document.getElementById('department').getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Department Uploads (%)',
                                data: dataValues,
                                backgroundColor: backgroundColors.slice(0, labels.length),
                                borderWidth: 5,
                                borderRadius: 10,
                                borderColor: '#fff',
                                hoverBorderWidth: 0,
                                cutout: '63%',
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            const department = departments[context.dataIndex];
                                            return ` ${department.documentCount}`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    console.warn("No department data available or unexpected API response:", result);
                }
            },
            error: function (xhr, status, error) {
                console.error("Error fetching dashboard data:", error);
            }
        });
    }
});
