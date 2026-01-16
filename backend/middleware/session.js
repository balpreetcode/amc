/**
 * Session Middleware
 * Validates session token and injects userId into request
 */

const { validateSessionToken } = require('../mongodb');

/**
 * Middleware to validate session token and set req.userId
 * Reads session token from: HTTP header, cookie, or URL query param
 */
async function sessionMiddleware(req, res, next) {
    // Check multiple sources for session token (priority order)
    const sessionToken = req.headers['x-session-token']
        || req.cookies?.workflow_session
        || req.query?.sessiontoken;

    if (!sessionToken) {
        // DEV BYPASS: Allow access as 'dev-user' when no token is present
        // in a real app, you'd check process.env.NODE_ENV
        req.userId = 'dev-user';
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
 * Reads session token from: HTTP header, cookie, or URL query param
 */
async function requireSession(req, res, next) {
    // Check multiple sources for session token (priority order)
    const sessionToken = req.headers['x-session-token']
        || req.cookies?.workflow_session
        || req.query?.sessiontoken;

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
