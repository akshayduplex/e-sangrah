import mongoose from "mongoose";

export const bumpVersion = (currentVersion) => {
    let [major, minor] = currentVersion.split('.').map(v => parseInt(v));

    minor += 1;

    const versionLabel = `${major}.${minor}`;
    const versionNumber = mongoose.Types.Decimal128.fromString(versionLabel);

    return { versionLabel, versionNumber };
};
