const { getExecutionById } = require('../models/execution');
const { rerunTask, getWorkflowExecution } = require('../utils/conductor-client');

/**
 * Rerun a specific node/task
 */
async function rerun(req, res) {
    try {
        const { taskId } = req.params;

        // Find execution by looking for the task in Conductor
        // This is a simplified approach - in production you'd want to track
        // task-to-execution mapping more explicitly

        // For now, we'll require the executionId in the request body
        const { executionId } = req.body;

        if (!executionId) {
            return res.status(400).json({
                error: 'Execution ID required in request body'
            });
        }

        const execution = getExecutionById(executionId);

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Check ownership
        if (execution.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get workflow execution from Conductor
        const conductorData = await getWorkflowExecution(execution.conductorWorkflowId);

        // Find the task reference name for this task ID
        const task = conductorData.tasks.find(t => t.taskId === taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found in execution' });
        }

        // Rerun the task
        await rerunTask(execution.conductorWorkflowId, task.taskReferenceName);

        res.json({
            message: 'Task rerun initiated',
            taskId,
            taskReferenceName: task.taskReferenceName
        });
    } catch (error) {
        console.error('[Nodes] Rerun error:', error);
        res.status(500).json({ error: 'Failed to rerun task' });
    }
}

module.exports = {
    rerun
};
