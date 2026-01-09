const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXECUTIONS_FILE = path.join(__dirname, '../storage/executions.json');

// Ensure storage directory exists
const storageDir = path.dirname(EXECUTIONS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize executions file if it doesn't exist
if (!fs.existsSync(EXECUTIONS_FILE)) {
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all executions
 */
function getAllExecutions() {
    const data = fs.readFileSync(EXECUTIONS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save executions to file
 */
function saveExecutions(executions) {
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
}

/**
 * Create execution record
 */
function createExecution(workflowId, conductorWorkflowId, userId) {
    const executions = getAllExecutions();

    const execution = {
        id: uuidv4(),
        workflowId,
        conductorWorkflowId,
        userId,
        status: 'pending',
        startedAt: new Date().toISOString(),
        completedAt: null,
        nodes: [],
        error: null
    };

    executions.push(execution);
    saveExecutions(executions);

    return execution;
}

/**
 * Get execution by ID
 */
function getExecutionById(id) {
    const executions = getAllExecutions();
    return executions.find(e => e.id === id);
}

/**
 * Get execution by Conductor workflow ID
 */
function getExecutionByConductorId(conductorWorkflowId) {
    const executions = getAllExecutions();
    return executions.find(e => e.conductorWorkflowId === conductorWorkflowId);
}

/**
 * Get executions with filters
 */
function getExecutions(filters = {}) {
    const executions = getAllExecutions();
    let filtered = executions;

    // Filter by user
    if (filters.userId) {
        filtered = filtered.filter(e => e.userId === filters.userId);
    }

    // Filter by workflow
    if (filters.workflowId) {
        filtered = filtered.filter(e => e.workflowId === filters.workflowId);
    }

    // Filter by status
    if (filters.status) {
        filtered = filtered.filter(e => e.status === filters.status);
    }

    // Sort by start time (newest first)
    filtered.sort((a, b) =>
        new Date(b.startedAt) - new Date(a.startedAt)
    );

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
        executions: filtered.slice(start, end),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
    };
}

/**
 * Update execution
 */
function updateExecution(id, updates) {
    const executions = getAllExecutions();
    const index = executions.findIndex(e => e.id === id);

    if (index === -1) {
        return null;
    }

    executions[index] = {
        ...executions[index],
        ...updates
    };

    saveExecutions(executions);

    return executions[index];
}

module.exports = {
    createExecution,
    getExecutionById,
    getExecutionByConductorId,
    getExecutions,
    updateExecution
};
