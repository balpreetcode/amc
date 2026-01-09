/**
 * Session Middleware
 * Validates session token and injects userId into request
 */

const { validateSessionToken } = require('../mongodb');

/**
 * Middleware to validate session token and set req.userId
 */
async function sessionMiddleware(req, res, next) {
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
        // Allow requests without session token, but no userId
        req.userId = null;
        return next();
    }

    try {
        const result = await validateSessionToken(sessionToken);

        if (result.valid) {
            req.userId = result.userId || 'anonymous';
            console.log(`[Session] Valid session for user: ${req.userId}`);
        } else {
            req.userId = null;
            console.log(`[Session] Invalid session: ${result.error}`);
        }
    } catch (error) {
        console.error('[Session] Middleware error:', error.message);
        req.userId = null;
    }

    next();
}

/**
 * Middleware that requires a valid session
 */
async function requireSession(req, res, next) {
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
        return res.status(401).json({ error: 'Session token required' });
    }

    try {
        const result = await validateSessionToken(sessionToken);

        if (!result.valid) {
            return res.status(401).json({ error: result.error || 'Invalid session' });
        }

        req.userId = result.userId || 'anonymous';
        next();
    } catch (error) {
        console.error('[Session] Middleware error:', error.message);
        res.status(500).json({ error: 'Session validation failed' });
    }
}

module.exports = {
    sessionMiddleware,
    requireSession
};
