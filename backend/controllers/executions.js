const {
    getExecutions,
    getExecutionById,
    getExecutionByConductorId,
    updateExecution
} = require('../models/execution');
const {
    getWorkflowExecution,
    retryWorkflow,
    restartWorkflow
} = require('../utils/conductor-client');
const { getExecutionLogs } = require('../utils/logger');

/**
 * List executions with filtering
 */
async function listExecutions(req, res) {
    try {
        const { workflowId, status, page, limit } = req.query;

        const filters = {
            userId: req.user.id,
            workflowId,
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = getExecutions(filters);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list executions' });
    }
}

/**
 * Get execution details
 */
async function getDetails(req, res) {
    try {
        const { id } = req.params;

        const execution = getExecutionById(id);

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Check ownership
        if (execution.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Fetch latest data from Conductor
        try {
            const conductorData = await getWorkflowExecution(execution.conductorWorkflowId);

            // Map Conductor status
            const statusMap = {
                'RUNNING': 'running',
                'COMPLETED': 'completed',
                'FAILED': 'failed',
                'PAUSED': 'paused'
            };

            const status = statusMap[conductorData.status] || 'pending';
            const completedAt = conductorData.endTime ?
                new Date(conductorData.endTime).toISOString() : null;

            // Update execution record if status changed
            if (execution.status !== status || (!execution.completedAt && completedAt)) {
                updateExecution(id, { status, completedAt });
            }

            // Combine local and Conductor data
            res.json({
                ...execution,
                status,
                completedAt,
                conductorData: {
                    status: conductorData.status,
                    tasks: conductorData.tasks
                }
            });
        } catch (err) {
            // Return local data if Conductor fetch fails
            res.json(execution);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to get execution details' });
    }
}

/**
 * Get execution nodes/tasks
 */
async function getNodes(req, res) {
    try {
        const { id } = req.params;

        const execution = getExecutionById(id);

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Check ownership
        if (execution.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Fetch from Conductor
        try {
            const conductorData = await getWorkflowExecution(execution.conductorWorkflowId);

            const nodes = (conductorData.tasks || []).map(task => ({
                nodeId: task.inputData?.nodeId || task.taskReferenceName,
                nodeType: task.inputData?.nodeType || task.taskType,
                taskId: task.taskId,
                status: mapTaskStatus(task.status),
                startTime: task.startTime ? new Date(task.startTime).toISOString() : null,
                endTime: task.endTime ? new Date(task.endTime).toISOString() : null,
                output: task.outputData,
                error: task.reasonForIncompletion || task.failureReason
            }));

            res.json({ nodes });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch execution nodes from Conductor' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to get execution nodes' });
    }
}

/**
 * Get execution logs
 */
async function getLogs(req, res) {
    try {
        const { id } = req.params;

        const execution = getExecutionById(id);

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Check ownership
        if (execution.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const logs = getExecutionLogs(execution.conductorWorkflowId);

        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get execution logs' });
    }
}

/**
 * Retry failed execution
 */
async function retry(req, res) {
    try {
        const { id } = req.params;

        const execution = getExecutionById(id);

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Check ownership
        if (execution.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Retry in Conductor
        await retryWorkflow(execution.conductorWorkflowId);

        // Update execution status
        updateExecution(id, { status: 'running' });

        res.json({ message: 'Execution retry initiated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retry execution' });
    }
}

function mapTaskStatus(status) {
    const statusMap = {
        'IN_PROGRESS': 'running',
        'RUNNING': 'running',
        'COMPLETED': 'completed',
        'FAILED': 'failed',
        'SCHEDULED': 'pending',
        'SKIPPED': 'skipped'
    };
    return statusMap[status] || 'pending';
}

module.exports = {
    listExecutions,
    getDetails,
    getNodes,
    getLogs,
    retry
};
