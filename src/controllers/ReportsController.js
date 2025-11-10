import { docTypes, profile_type } from "../constant/Constant.js";
import Designation from "../models/Designation.js";


// Render Dashboard page
export const showReportPage = async (req, res) => {
    try {
        const designation = await Designation.find({ status: 'Active' })
            .select("name priority")
            .sort({ priority: 1 });

        res.render("pages/reports/reports", {
            user: req.user,
            roles: profile_type,
            designation: designation,
            docTypes
        });
    } catch (err) {
        logger.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load dashboard"
        });
    }
};

export const showComplianceRetentionPage = async (req, res) => {
    try {
        res.render("pages/reports/complianceRetention", {
            user: req.user,
            roles: profile_type
        });
    } catch (err) {
        logger.error("ComplianceRetention Page render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Unable to load ComplianceRetention Page"
        });
    }
};
