export const bumpVersion = (currentVersion) => {
    // Simple version bump - you can enhance this for major/minor versions
    const versionParts = currentVersion.split('.').map(Number);
    versionParts[1] += 1; // Bump minor version

    // Handle carry-over
    if (versionParts[1] >= 10) {
        versionParts[0] += 1;
        versionParts[1] = 0;
    }

    const versionLabel = versionParts.join('.');
    const versionNumber = parseFloat(versionLabel);

    return { versionLabel, versionNumber };
};