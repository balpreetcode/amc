/**
 * MongoDB Connection Module for Session Token Validation
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://balpreet:ct8bCW7LDccrGAmQ@cluster0.2pwq0w2.mongodb.net/enayetTest';
const DB_NAME = 'enayetTest';

let client = null;
let db = null;

/**
 * Get MongoDB connection
 */
async function getConnection() {
    if (db) {
        return db;
    }

    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('[MongoDB] Connected to session database');
        return db;
    } catch (error) {
        console.error('[MongoDB] Connection error:', error.message);
        throw error;
    }
}

/**
 * Validate session token
 * @param {string} token - The session token to validate
 * @returns {Promise<{valid: boolean, userId?: string, error?: string}>}
 */
async function validateSessionToken(token) {
    if (!token) {
        return { valid: false, error: 'No token provided' };
    }

    // Check for hardcoded master session token (always allowed)
    const masterToken = process.env.MASTER_SESSION_TOKEN;
    if (masterToken && token === masterToken) {
        console.log('[MongoDB] Master session token validated');
        return { valid: true, userId: 'master' };
    }

    try {
        const database = await getConnection();
        const sessions = database.collection('sessions');

        // Look for the session token - checking multiple possible field names
        const session = await sessions.findOne({
            $or: [
                { token: token },
                { sessionToken: token },
                { _id: token }
            ]
        });

        if (!session) {
            return { valid: false, error: 'Session not found' };
        }

        // Check if session is active - checking multiple possible fields
        const isActive =
            session.isActive === true ||
            session.active === true ||
            session.status === 'active' ||
            (session.expiresAt && new Date(session.expiresAt) > new Date());

        if (!isActive) {
            return { valid: false, error: 'Session is not active' };
        }

        return {
            valid: true,
            userId: session.userId || session.user_id || session.user
        };
    } catch (error) {
        console.error('[MongoDB] Session validation error:', error.message);
        return { valid: false, error: 'Database error' };
    }
}

/**
 * Close MongoDB connection
 */
async function closeConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('[MongoDB] Connection closed');
    }
}

module.exports = {
    getConnection,
    validateSessionToken,
    closeConnection
};
