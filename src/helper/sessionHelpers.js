// utils/sessionHelpers.js
import mongoose from "mongoose";

export const getSessionFilters = (req) => {
    const selectedYear = req.session?.selectedYear || null;
    const selectedProjectId = req.session?.selectedProject || null;

    return {
        selectedYear,
        selectedProjectId: selectedProjectId ? new mongoose.Types.ObjectId(selectedProjectId) : null,
    };
};
