// utils/versionManager.js
export class VersionManager {
    static getNextVersion(currentVersion, changeType = 'minor') {
        const [major, minor] = currentVersion.toString().split('.').map(Number);

        switch (changeType) {
            case 'major':
                return `${major + 1}.0`;
            case 'minor':
                return `${major}.${minor + 1}`;
            default:
                return `${major}.${minor + 1}`;
        }
    }

    static async createVersionSnapshot(document) {
        return {
            description: document.description,
            metadata: { ...document.metadata },
            tags: [...document.tags],
            compliance: { ...document.compliance.toObject() },
            files: [...document.files],
            signature: document.signature ? { ...document.signature } : null,
            project: document.project,
            department: document.department,
            projectManager: document.projectManager,
            documentDonor: document.documentDonor,
            documentVendor: document.documentVendor,
            status: document.status,
            link: document.link,
            comment: document.comment,
            documentDate: document.documentDate,
            createdAt: document.createdAt
        };
    }

    static detectChanges(oldDoc, newDoc) {
        const changes = [];
        const fieldsToTrack = [
            'description', 'metadata', 'tags', 'compliance', 'status',
            'project', 'department', 'projectManager', 'documentDonor',
            'documentVendor', 'link', 'comment', 'documentDate'
        ];

        fieldsToTrack.forEach(field => {
            const oldValue = oldDoc[field];
            const newValue = newDoc[field];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field,
                    oldValue: this.sanitizeValue(oldValue),
                    newValue: this.sanitizeValue(newValue)
                });
            }
        });

        return changes;
    }

    static sanitizeValue(value) {
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (value && typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    }

    static generateChangeDescription(changes) {
        if (changes.length === 0) return 'Minor updates';

        const changeMessages = changes.map(change => {
            switch (change.field) {
                case 'description':
                    return 'Description updated';
                case 'metadata':
                    return 'Metadata modified';
                case 'tags':
                    return 'Tags updated';
                case 'status':
                    return `Status changed from ${change.oldValue} to ${change.newValue}`;
                case 'compliance':
                    return 'Compliance settings updated';
                default:
                    return `${change.field} updated`;
            }
        });

        return changeMessages.slice(0, 3).join(', ') +
            (changeMessages.length > 3 ? ` and ${changeMessages.length - 3} more changes` : '');
    }
}