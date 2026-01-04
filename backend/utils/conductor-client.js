const axios = require('axios');

const CONDUCTOR_URL = process.env.CONDUCTOR_URL || 'https://p5200.winds-os.com/api';

const conductor = axios.create({
    baseURL: CONDUCTOR_URL,
    timeout: 30000
});

/**
 * Get workflow execution by ID
 */
async function getWorkflowExecution(workflowId) {
    const response = await conductor.get(`/workflow/${workflowId}`);
    return response.data;
}

/**
 * Search for workflow executions
 */
async function searchWorkflows(params = {}) {
    const response = await conductor.get('/workflow/search', { params });
    return response.data;
}

/**
 * Pause a workflow
 */
async function pauseWorkflow(workflowId) {
    const response = await conductor.put(`/workflow/${workflowId}/pause`);
    return response.data;
}

/**
 * Resume a workflow
 */
async function resumeWorkflow(workflowId) {
    const response = await conductor.put(`/workflow/${workflowId}/resume`);
    return response.data;
}

/**
 * Terminate a workflow
 */
async function terminateWorkflow(workflowId, reason = 'User requested cancellation') {
    const response = await conductor.delete(`/workflow/${workflowId}`, {
        params: { reason }
    });
    return response.data;
}

/**
 * Retry a failed workflow
 */
async function retryWorkflow(workflowId) {
    const response = await conductor.post(`/workflow/${workflowId}/retry`);
    return response.data;
}

/**
 * Restart a workflow
 */
async function restartWorkflow(workflowId) {
    const response = await conductor.post(`/workflow/${workflowId}/restart`);
    return response.data;
}

/**
 * Rerun a specific task
 */
async function rerunTask(workflowId, taskReferenceName) {
    const response = await conductor.post(`/workflow/${workflowId}/rerun`, {
        taskReferenceName
    });
    return response.data;
}

module.exports = {
    conductor,
    getWorkflowExecution,
    searchWorkflows,
    pauseWorkflow,
    resumeWorkflow,
    terminateWorkflow,
    retryWorkflow,
    restartWorkflow,
    rerunTask
};
