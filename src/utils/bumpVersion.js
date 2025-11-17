export const bumpVersion = (currentVersionLabel = "1.0") => {
    try {
        const versionParts = currentVersionLabel.split('.');
        if (versionParts.length !== 2) {
            // Reset to 1.0 if invalid format
            return { versionLabel: "1.0", versionNumber: 1 };
        }

        let major = parseInt(versionParts[0]) || 1;
        let minor = parseInt(versionParts[1]) || 0;

        // Bump minor version, rollover to major if minor reaches 10
        if (minor >= 9) {
            major += 1;
            minor = 0;
        } else {
            minor += 1;
        }

        const versionLabel = `${major}.${minor}`;
        const versionNumber = major * 100 + minor; // Convert to sortable number

        return { versionLabel, versionNumber };
    } catch (error) {
        console.error('Error bumping version:', error);
        return { versionLabel: "1.0", versionNumber: 1 };
    }
};