const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const VERSIONS_FILE = path.join(__dirname, '../storage/workflow-versions.json');

// Ensure storage directory exists
const storageDir = path.dirname(VERSIONS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize versions file if it doesn't exist
if (!fs.existsSync(VERSIONS_FILE)) {
    fs.writeFileSync(VERSIONS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all versions
 */
function getAllVersions() {
    const data = fs.readFileSync(VERSIONS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save versions to file
 */
function saveVersions(versions) {
    fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

/**
 * Create a new version
 */
function createVersion(workflowId, workflow, changeNote = '') {
    const versions = getAllVersions();

    const version = {
        id: uuidv4(),
        workflowId,
        versionNumber: workflow.version,
        snapshot: {
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            tags: workflow.tags
        },
        changeNote,
        createdAt: new Date().toISOString()
    };

    versions.push(version);
    saveVersions(versions);

    return version;
}

/**
 * Get versions for a workflow
 */
function getVersionsByWorkflowId(workflowId, page = 1, limit = 20) {
    const versions = getAllVersions();
    const filtered = versions
        .filter(v => v.workflowId === workflowId)
        .sort((a, b) => b.versionNumber - a.versionNumber);

    const start = (page - 1) * limit;
    const end = start + limit;

    return {
        versions: filtered.slice(start, end),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
    };
}

/**
 * Get version by workflow ID and version number
 */
function getVersionByNumber(workflowId, versionNumber) {
    const versions = getAllVersions();
    return versions.find(v =>
        v.workflowId === workflowId &&
        v.versionNumber === versionNumber
    );
}

/**
 * Get latest version for a workflow
 */
function getLatestVersion(workflowId) {
    const versions = getAllVersions();
    const workflowVersions = versions
        .filter(v => v.workflowId === workflowId)
        .sort((a, b) => b.versionNumber - a.versionNumber);

    return workflowVersions[0] || null;
}

module.exports = {
    createVersion,
    getVersionsByWorkflowId,
    getVersionByNumber,
    getLatestVersion
};
