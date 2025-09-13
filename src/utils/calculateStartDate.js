export function calculateStartDate(period) {
    const startDate = new Date();
    switch (period) {
        case "daily": startDate.setDate(startDate.getDate() - 1); break;
        case "weekly": startDate.setDate(startDate.getDate() - 7); break;
        case "monthly": startDate.setMonth(startDate.getMonth() - 1); break;
        case "yearly": startDate.setFullYear(startDate.getFullYear() - 1); break;
    }
    return startDate;
}