import mongoose from "mongoose";

export const bumpVersion = (document) => {
    const current = parseFloat(document.versioning.currentVersion?.toString() || "1.0");
    const newVersionNumber = (Math.round((current + 0.1) * 10) / 10).toFixed(1);

    const newVersion = mongoose.Types.Decimal128.fromString(newVersionNumber);
    const nextVersion = mongoose.Types.Decimal128.fromString((parseFloat(newVersionNumber) + 0.1).toFixed(1));

    document.versioning.previousVersion = document.versioning.currentVersion;
    document.versioning.currentVersion = newVersion;
    document.versioning.nextVersion = nextVersion;
};

