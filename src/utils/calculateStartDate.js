export function calculateStartDate(period) {
    const startDate = new Date();
    switch (period) {
        case "today":
            // No change needed — same day
            break;
        case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
        case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        default:
            throw new Error(`Unknown period: ${period}`);
    }
    return startDate;
}
