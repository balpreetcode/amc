const {
    createWorkflow,
    getWorkflowById,
    getWorkflowsByUserId,
    updateWorkflow,
    deleteWorkflow,
    cloneWorkflow
} = require('../models/workflow');
const { createVersion } = require('../models/version');
const { pauseWorkflow, resumeWorkflow, terminateWorkflow } = require('../utils/conductor-client');

/**
 * List workflows for current user
 */
async function listWorkflows(req, res) {
    try {
        const { search, tags, sortBy, sortOrder, page, limit } = req.query;

        const filters = {
            search,
            tags: tags ? tags.split(',') : undefined,
            sortBy: sortBy || 'updatedAt',
            sortOrder: sortOrder || 'desc',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = getWorkflowsByUserId(req.user.id, filters);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list workflows' });
    }
}

/**
 * Create a new workflow
 */
async function create(req, res) {
    try {
        const { name, description, nodes, tags } = req.body;

        if (!name || !nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Name and nodes are required' });
        }

        const workflow = createWorkflow({
            name,
            description,
            nodes,
            userId: req.user.id,
            tags: tags || []
        });

        // Create initial version
        createVersion(workflow.id, workflow, 'Initial version');

        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create workflow' });
    }
}

/**
 * Get workflow by ID
 */
async function getById(req, res) {
    try {
        const { id } = req.params;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get workflow' });
    }
}

/**
 * Update workflow
 */
async function update(req, res) {
    try {
        const { id } = req.params;
        const { name, description, nodes, tags } = req.body;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (nodes !== undefined) updates.nodes = nodes;
        if (tags !== undefined) updates.tags = tags;

        const updatedWorkflow = updateWorkflow(id, updates);

        // Create new version if nodes changed
        if (nodes !== undefined) {
            createVersion(id, updatedWorkflow, 'Workflow updated');
        }

        res.json(updatedWorkflow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update workflow' });
    }
}

/**
 * Delete workflow
 */
async function remove(req, res) {
    try {
        const { id } = req.params;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const deleted = deleteWorkflow(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
}

/**
 * Clone workflow
 */
async function clone(req, res) {
    try {
        const { id } = req.params;

        const workflow = getWorkflowById(id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const cloned = cloneWorkflow(id, req.user.id);

        // Create initial version for cloned workflow
        createVersion(cloned.id, cloned, 'Cloned from workflow');

        res.json(cloned);
    } catch (error) {
        res.status(500).json({ error: 'Failed to clone workflow' });
    }
}

/**
 * Pause workflow execution (stub - needs execution tracking integration)
 */
async function pause(req, res) {
    try {
        const { id } = req.params;

        // This is a stub - in a full implementation, you would:
        // 1. Find active execution for this workflow
        // 2. Call pauseWorkflow(conductorWorkflowId)
        // 3. Update execution status

        res.json({
            message: 'Pause functionality requires active execution tracking',
            note: 'Use POST /executions/:id/pause to pause a specific execution'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to pause workflow' });
    }
}

/**
 * Resume workflow execution (stub - needs execution tracking integration)
 */
async function resume(req, res) {
    try {
        const { id } = req.params;

        res.json({
            message: 'Resume functionality requires active execution tracking',
            note: 'Use POST /executions/:id/resume to resume a specific execution'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resume workflow' });
    }
}

/**
 * Cancel workflow execution (stub - needs execution tracking integration)
 */
async function cancel(req, res) {
    try {
        const { id } = req.params;

        res.json({
            message: 'Cancel functionality requires active execution tracking',
            note: 'Use POST /executions/:id/cancel to cancel a specific execution'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel workflow' });
    }
}

module.exports = {
    listWorkflows,
    create,
    getById,
    update,
    remove,
    clone,
    pause,
    resume,
    cancel
};
