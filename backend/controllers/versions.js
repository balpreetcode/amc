const {
    getVersionsByWorkflowId,
    getVersionByNumber,
    createVersion
} = require('../models/version');
const { getWorkflowById, updateWorkflow } = require('../models/workflow');

/**
 * List versions for a workflow
 */
async function listVersions(req, res) {
    try {
        const { id } = req.params;
        const { page, limit } = req.query;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = getVersionsByWorkflowId(
            id,
            parseInt(page) || 1,
            parseInt(limit) || 20
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list versions' });
    }
}

/**
 * Create a new version
 */
async function create(req, res) {
    try {
        const { id } = req.params;
        const { changeNote } = req.body;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const version = createVersion(id, workflow, changeNote || '');

        res.json(version);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create version' });
    }
}

/**
 * Get specific version
 */
async function getVersion(req, res) {
    try {
        const { id, version } = req.params;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const versionRecord = getVersionByNumber(id, parseInt(version));

        if (!versionRecord) {
            return res.status(404).json({ error: 'Version not found' });
        }

        res.json(versionRecord);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get version' });
    }
}

/**
 * Restore workflow to a specific version
 */
async function restore(req, res) {
    try {
        const { id, version } = req.params;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const versionRecord = getVersionByNumber(id, parseInt(version));

        if (!versionRecord) {
            return res.status(404).json({ error: 'Version not found' });
        }

        // Restore workflow from version snapshot
        const updates = {
            name: versionRecord.snapshot.name,
            description: versionRecord.snapshot.description,
            nodes: versionRecord.snapshot.nodes,
            tags: versionRecord.snapshot.tags
        };

        const updatedWorkflow = updateWorkflow(id, updates);

        // Create new version to track the restore
        createVersion(id, updatedWorkflow, `Restored from version ${version}`);

        res.json(updatedWorkflow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore version' });
    }
}

module.exports = {
    listVersions,
    create,
    getVersion,
    restore
};
