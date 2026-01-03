const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const WORKFLOWS_FILE = path.join(__dirname, '../storage/workflows.json');

// Ensure storage directory exists
const storageDir = path.dirname(WORKFLOWS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize workflows file if it doesn't exist
if (!fs.existsSync(WORKFLOWS_FILE)) {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all workflows
 */
function getAllWorkflows() {
    const data = fs.readFileSync(WORKFLOWS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save workflows to file
 */
function saveWorkflows(workflows) {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
}

/**
 * Create a new workflow
 */
function createWorkflow({ name, description, nodes, userId, tags = [] }) {
    const workflows = getAllWorkflows();

    const workflow = {
        id: uuidv4(),
        name,
        description: description || '',
        nodes,
        userId,
        tags,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodeCount: nodes.length
    };

    workflows.push(workflow);
    saveWorkflows(workflows);

    return workflow;
}

/**
 * Get workflow by ID
 */
function getWorkflowById(id) {
    const workflows = getAllWorkflows();
    return workflows.find(w => w.id === id);
}

/**
 * Get workflows by user ID
 */
function getWorkflowsByUserId(userId, filters = {}) {
    const workflows = getAllWorkflows();
    let filtered = workflows.filter(w => w.userId === userId);

    // Apply filters
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(w =>
            w.name.toLowerCase().includes(searchLower) ||
            (w.description && w.description.toLowerCase().includes(searchLower))
        );
    }

    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(w =>
            filters.tags.some(tag => w.tags.includes(tag))
        );
    }

    // Sort
    if (filters.sortBy) {
        const sortField = filters.sortBy;
        const sortOrder = filters.sortOrder || 'desc';
        filtered.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
        workflows: filtered.slice(start, end),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit)
    };
}

/**
 * Update workflow
 */
function updateWorkflow(id, updates) {
    const workflows = getAllWorkflows();
    const index = workflows.findIndex(w => w.id === id);

    if (index === -1) {
        return null;
    }

    // Don't allow updating id, userId, or createdAt
    const { id: _, userId: __, createdAt: ___, ...allowedUpdates } = updates;

    // Increment version if nodes changed
    const versionIncrement = updates.nodes ? { version: workflows[index].version + 1 } : {};

    workflows[index] = {
        ...workflows[index],
        ...allowedUpdates,
        ...versionIncrement,
        updatedAt: new Date().toISOString(),
        nodeCount: updates.nodes ? updates.nodes.length : workflows[index].nodeCount
    };

    saveWorkflows(workflows);

    return workflows[index];
}

/**
 * Delete workflow
 */
function deleteWorkflow(id) {
    const workflows = getAllWorkflows();
    const filtered = workflows.filter(w => w.id !== id);

    if (filtered.length === workflows.length) {
        return false;
    }

    saveWorkflows(filtered);
    return true;
}

/**
 * Clone workflow
 */
function cloneWorkflow(id, userId) {
    const workflow = getWorkflowById(id);

    if (!workflow) {
        return null;
    }

    const cloned = {
        ...workflow,
        id: uuidv4(),
        name: `${workflow.name} (Copy)`,
        userId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const workflows = getAllWorkflows();
    workflows.push(cloned);
    saveWorkflows(workflows);

    return cloned;
}

module.exports = {
    createWorkflow,
    getWorkflowById,
    getWorkflowsByUserId,
    updateWorkflow,
    deleteWorkflow,
    cloneWorkflow,
    getAllWorkflows
};
