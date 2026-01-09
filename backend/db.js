/**
 * PostgreSQL Database Connection Module
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dL5Cq1uEvtUa@ep-silent-sunset-ahmjecra-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Create connection pool
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
});

/**
 * Initialize database - create tables if they don't exist
 */
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Create templates table with user_id column
        await client.query(`
            CREATE TABLE IF NOT EXISTS templates (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_modified TIMESTAMP NOT NULL DEFAULT NOW(),
                video_preview TEXT,
                nodes JSONB NOT NULL,
                node_count INTEGER NOT NULL,
                template_version INTEGER NOT NULL DEFAULT 1,
                user_id VARCHAR(255)
            );
        `);

        // Add user_id column if it doesn't exist (migration)
        await client.query(`
            ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
        `);

        // Create index on name for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
        `);

        // Create index on user_id for faster user-scoped queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
        `);

        // Create node_outputs table for storing execution output URLs
        await client.query(`
            CREATE TABLE IF NOT EXISTS node_outputs (
                id SERIAL PRIMARY KEY,
                workflow_id VARCHAR(255) NOT NULL,
                node_id VARCHAR(255) NOT NULL,
                node_type VARCHAR(100) NOT NULL,
                output_url TEXT,
                output_type VARCHAR(50),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                user_id VARCHAR(255)
            );
        `);

        // Create indexes for node_outputs
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_node_outputs_workflow ON node_outputs(workflow_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_node_outputs_user ON node_outputs(user_id);
        `);

        console.log('[Database] Tables initialized (templates, node_outputs)');
    } catch (error) {
        console.error('[Database] Error initializing database:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Map database row to template object
 */
function mapRowToTemplate(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version,
        userId: row.user_id
    };
}

/**
 * Get all templates (optionally filtered by user)
 * @param {string|null} userId - If provided, filter by user. If null, return global templates only.
 * @param {boolean} includeGlobal - If true, also include templates with no user_id (global)
 */
async function getAllTemplates(userId = null, includeGlobal = true) {
    let query;
    let params = [];

    if (userId) {
        if (includeGlobal) {
            // Return user's templates + global templates
            query = 'SELECT * FROM templates WHERE user_id = $1 OR user_id IS NULL ORDER BY last_modified DESC';
            params = [userId];
        } else {
            // Return only user's templates
            query = 'SELECT * FROM templates WHERE user_id = $1 ORDER BY last_modified DESC';
            params = [userId];
        }
    } else {
        // Return only global templates (no user_id)
        query = 'SELECT * FROM templates WHERE user_id IS NULL ORDER BY last_modified DESC';
    }

    const result = await pool.query(query, params);
    return result.rows.map(mapRowToTemplate);
}

/**
 * Get template by ID (with optional user check)
 */
async function getTemplateById(id, userId = null) {
    let query;
    let params;

    if (userId) {
        // User can access their own templates or global templates
        query = 'SELECT * FROM templates WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)';
        params = [id, userId];
    } else {
        query = 'SELECT * FROM templates WHERE id = $1';
        params = [id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
        return null;
    }

    return mapRowToTemplate(result.rows[0]);
}

/**
 * Get template by name (with optional user check)
 */
async function getTemplateByName(name, userId = null) {
    let query;
    let params;

    if (userId) {
        query = 'SELECT * FROM templates WHERE name = $1 AND (user_id = $2 OR user_id IS NULL)';
        params = [name, userId];
    } else {
        query = 'SELECT * FROM templates WHERE name = $1';
        params = [name];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
        return null;
    }

    return mapRowToTemplate(result.rows[0]);
}

/**
 * Create new template
 */
async function createTemplate(template) {
    const result = await pool.query(
        `INSERT INTO templates
         (id, name, description, created_at, last_modified, video_preview, nodes, node_count, template_version, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            template.id,
            template.name,
            template.description || '',
            template.createdAt,
            template.lastModified,
            template.videoPreview || '',
            JSON.stringify(template.nodes),
            template.nodeCount,
            template.templateVersion,
            template.userId || null
        ]
    );

    return mapRowToTemplate(result.rows[0]);
}

/**
 * Update template (with optional user check)
 */
async function updateTemplate(id, updates, userId = null) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
    }
    if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
    }
    if (updates.videoPreview !== undefined) {
        fields.push(`video_preview = $${paramCount++}`);
        values.push(updates.videoPreview);
    }
    if (updates.nodes !== undefined) {
        fields.push(`nodes = $${paramCount++}`);
        values.push(JSON.stringify(updates.nodes));
        fields.push(`node_count = $${paramCount++}`);
        values.push(updates.nodes.length);
    }

    // Always update last_modified
    fields.push(`last_modified = $${paramCount++}`);
    values.push(new Date().toISOString());

    values.push(id);

    let query;
    if (userId) {
        // Only allow updating user's own templates
        values.push(userId);
        query = `UPDATE templates SET ${fields.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    } else {
        query = `UPDATE templates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return null;
    }

    return mapRowToTemplate(result.rows[0]);
}

/**
 * Delete template (with optional user check)
 */
async function deleteTemplate(id, userId = null) {
    let query;
    let params;

    if (userId) {
        // Only allow deleting user's own templates
        query = 'DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING *';
        params = [id, userId];
    } else {
        query = 'DELETE FROM templates WHERE id = $1 RETURNING *';
        params = [id];
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

/**
 * Save node execution output to database
 * @param {string} workflowId - Workflow execution ID
 * @param {string} nodeId - Node ID within the workflow
 * @param {string} nodeType - Type of node (e.g., 'text_to_image')
 * @param {string} outputUrl - URL of the output (image/video/audio)
 * @param {string} outputType - Type of output ('image', 'video', 'audio', 'text')
 * @param {object} metadata - Additional metadata about the output
 * @param {string|null} userId - User ID for scoping
 */
async function saveNodeOutput(workflowId, nodeId, nodeType, outputUrl, outputType, metadata = {}, userId = null) {
    const result = await pool.query(
        `INSERT INTO node_outputs (workflow_id, node_id, node_type, output_url, output_type, metadata, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [workflowId, nodeId, nodeType, outputUrl, outputType, JSON.stringify(metadata), userId]
    );
    return result.rows[0];
}

/**
 * Get all outputs for a workflow
 * @param {string} workflowId - Workflow execution ID
 * @param {string|null} userId - Optional user ID for scoping
 */
async function getNodeOutputs(workflowId, userId = null) {
    const query = userId
        ? 'SELECT * FROM node_outputs WHERE workflow_id = $1 AND user_id = $2 ORDER BY created_at'
        : 'SELECT * FROM node_outputs WHERE workflow_id = $1 ORDER BY created_at';
    const params = userId ? [workflowId, userId] : [workflowId];
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get latest output for a specific node
 * @param {string} nodeId - Node ID
 * @param {string|null} userId - Optional user ID for scoping
 */
async function getLatestNodeOutput(nodeId, userId = null) {
    const query = userId
        ? 'SELECT * FROM node_outputs WHERE node_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1'
        : 'SELECT * FROM node_outputs WHERE node_id = $1 ORDER BY created_at DESC LIMIT 1';
    const params = userId ? [nodeId, userId] : [nodeId];
    const result = await pool.query(query, params);
    return result.rows[0] || null;
}

module.exports = {
    pool,
    initializeDatabase,
    getAllTemplates,
    getTemplateById,
    getTemplateByName,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    saveNodeOutput,
    getNodeOutputs,
    getLatestNodeOutput
};
