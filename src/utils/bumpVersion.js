import mongoose from "mongoose";

export const bumpVersion = (document) => {
    // Use your existing fields
    const currentStr = document.currentVersionLabel || "1.0";

    // Convert "1.0" → 10
    const current = parseInt(currentStr.replace(".", ""), 10);

    // Increment by 1 (0.1 in float terms)
    const newVersionInt = current + 1;
    const newVersionStr = `${Math.floor(newVersionInt / 10)}.${newVersionInt % 10}`;

    // Next version
    const nextVersionInt = newVersionInt + 1;
    const nextVersionStr = `${Math.floor(nextVersionInt / 10)}.${nextVersionInt % 10}`;

    // Update document fields
    document.previousVersionLabel = document.currentVersionLabel; // optional, you can add it
    document.currentVersionLabel = newVersionStr;
    document.currentVersionNumber = parseInt(newVersionStr.replace(".", ""), 10);

    return document;
};
