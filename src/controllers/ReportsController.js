// Render Dashboard page
export const showReportPage = async (req, res) => {
    try {
        res.render("pages/reports/reports", {
            user: req.user
        });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};