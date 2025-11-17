export const bumpVersion = (document) => {
    // default to 1.0 if empty
    const current = document.currentVersionLabel || "1.0";

    let [major, minor] = current.split('.').map(Number);

    // bump logic: rollover minor at 9
    if (minor >= 9) {
        major += 1;
        minor = 0;
    } else {
        minor += 1;
    }

    const nextLabel = `${major}.${minor}`;

    document.previousVersionLabel = document.currentVersionLabel;
    document.currentVersionLabel = nextLabel;
    document.currentVersionNumber = nextLabel; // keep simple

    return document;
};
