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
        // Create templates table
        await client.query(`
            CREATE TABLE IF NOT EXISTS templates (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_modified TIMESTAMP NOT NULL DEFAULT NOW(),
                video_preview TEXT,
                nodes JSONB NOT NULL,
                node_count INTEGER NOT NULL,
                template_version INTEGER NOT NULL DEFAULT 1
            );
        `);

        // Create index on name for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
        `);

        console.log('[Database] Templates table initialized');
    } catch (error) {
        console.error('[Database] Error initializing database:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all templates
 */
async function getAllTemplates() {
    const result = await pool.query(
        'SELECT * FROM templates ORDER BY last_modified DESC'
    );

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version
    }));
}

/**
 * Get template by ID
 */
async function getTemplateById(id) {
    const result = await pool.query(
        'SELECT * FROM templates WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version
    };
}

/**
 * Get template by name
 */
async function getTemplateByName(name) {
    const result = await pool.query(
        'SELECT * FROM templates WHERE name = $1',
        [name]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version
    };
}

/**
 * Create new template
 */
async function createTemplate(template) {
    const result = await pool.query(
        `INSERT INTO templates
         (id, name, description, created_at, last_modified, video_preview, nodes, node_count, template_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
            template.templateVersion
        ]
    );

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version
    };
}

/**
 * Update template
 */
async function updateTemplate(id, updates) {
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

    const result = await pool.query(
        `UPDATE templates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdAt: row.created_at,
        lastModified: row.last_modified,
        videoPreview: row.video_preview || '',
        nodes: row.nodes,
        nodeCount: row.node_count,
        templateVersion: row.template_version
    };
}

/**
 * Delete template
 */
async function deleteTemplate(id) {
    const result = await pool.query(
        'DELETE FROM templates WHERE id = $1 RETURNING *',
        [id]
    );

    return result.rows.length > 0;
}

module.exports = {
    pool,
    initializeDatabase,
    getAllTemplates,
    getTemplateById,
    getTemplateByName,
    createTemplate,
    updateTemplate,
    deleteTemplate
};
