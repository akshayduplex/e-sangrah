import mongoose from "mongoose";

export const bumpVersion = (document) => {
    const currentStr = document.versioning.currentVersion?.toString() || "1.0";
    const current = parseInt(currentStr.replace(".", ""), 10); // "1.0" → 10
    const newVersionInt = current + 1; // +0.1 → +1 in int math
    const newVersionStr = `${Math.floor(newVersionInt / 10)}.${newVersionInt % 10}`;

    const newVersion = mongoose.Types.Decimal128.fromString(newVersionStr);
    const nextVersionInt = newVersionInt + 1;
    const nextVersionStr = `${Math.floor(nextVersionInt / 10)}.${nextVersionInt % 10}`;
    const nextVersion = mongoose.Types.Decimal128.fromString(nextVersionStr);

    document.versioning.previousVersion = document.versioning.currentVersion;
    document.versioning.currentVersion = newVersion;
    document.versioning.nextVersion = nextVersion;

    return document;
};
