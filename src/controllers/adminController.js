import mongoose from "mongoose";
import Document from "../models/Document.js";
import { successResponse, failResponse, errorResponse } from "../utils/responseHandler.js";
import { calculateStartDate } from "../utils/calculateStartDate.js";
import Approval from "../models/Approval.js";

//Page controllers

// Render Dashboard page
export const showAdminApprovalPage = (req, res) => {
    try {
        res.render("pages/admin/approval", {
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

export const showApprovalTrackPage = async (req, res) => {
    try {
        const documentId = req.params.id;

        // if (!documentId) {
        //     return res.status(400).send("Document ID is required");
        // }

        // // Fetch document and populate all references
        // const document = await Document.findById(documentId)
        //     .populate('project')               // project details
        //     .populate('department')            // department details
        //     .populate('folderId')              // folder details
        //     .populate('projectManager')        // project manager
        //     .populate('documentDonor')         // donor
        //     .populate('documentVendor')        // vendor
        //     .populate('owner')                 // document owner
        //     .populate('files')                 // all files
        //     .populate({
        //         path: 'approvalHistory',       // approvals
        //         populate: { path: 'approver', model: 'User' } // nested approver details
        //     })
        //     .populate({
        //         path: 'versionHistory.changedBy', // who made version changes
        //         model: 'User'
        //     })
        //     .lean(); // convert to plain JS object

        // if (!document) {
        //     return res.status(404).send("Document not found");
        // }

        // // Fetch approvals separately if needed for filtering by user
        // const approvals = await Approval.find({ document: documentId })
        //     .populate("approver", "name role")
        //     .sort({ level: 1 });

        res.render('pages/admin/approval-tracking', {
            documentId: documentId,
            // document,
            // approvals,
            user: req.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/admin/approval-tracking', {
            document: null,
            approvals: [],
            user: req.user
        });
    }
};


//API Controllers

/**
 * Get documents submitted by current user (My Approvals)
 * GET /api/documents/my-approvals
 */
export const getMyApprovals = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, department, createdAt } = req.query;

        const filter = { owner: userId };

        // Status filter
        if (status && status !== "All") filter.status = status;

        // Department filter
        if (department && mongoose.Types.ObjectId.isValid(department))
            filter.department = department;

        // Date filter
        if (createdAt) {
            const [day, month, year] = createdAt.split("-").map(Number);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        const documents = await Document.find(filter)
            .populate("department", "name")
            .populate("documentDonor", "name")
            .populate("files")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: documents });
    } catch (error) {
        console.error("Error in getMyApprovals:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};