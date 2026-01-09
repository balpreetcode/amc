const { verifyToken } = require('../utils/jwt');
const { validateApiKey } = require('../models/api-key');
const { findUserById } = require('../models/user');

/**
 * Authenticate request via JWT or API Key
 */
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    // Try API Key first
    if (apiKey) {
        const keyRecord = validateApiKey(apiKey);

        if (!keyRecord) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Load user
        const user = findUserById(keyRecord.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.authMethod = 'api_key';
        req.apiKeyScopes = keyRecord.scopes;

        return next();
    }

    // Try JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const result = verifyToken(token);

    if (!result.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Load user
    const user = findUserById(result.payload.userId);

    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.authMethod = 'jwt';

    next();
}

/**
 * Optional authentication - adds user if available but doesn't require it
 */
function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    // Try API Key first
    if (apiKey) {
        const keyRecord = validateApiKey(apiKey);

        if (keyRecord) {
            const user = findUserById(keyRecord.userId);
            if (user) {
                req.user = user;
                req.authMethod = 'api_key';
                req.apiKeyScopes = keyRecord.scopes;
            }
        }
    }
    // Try JWT
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const result = verifyToken(token);

        if (result.valid) {
            const user = findUserById(result.payload.userId);
            if (user) {
                req.user = user;
                req.authMethod = 'jwt';
            }
        }
    }

    next();
}

/**
 * Check if user has required scope
 */
function requireScope(scope) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // JWT users have all scopes
        if (req.authMethod === 'jwt') {
            return next();
        }

        // Check API key scopes
        if (req.authMethod === 'api_key') {
            if (!req.apiKeyScopes.includes(scope)) {
                return res.status(403).json({
                    error: `Insufficient permissions. Required scope: ${scope}`
                });
            }
        }

        next();
    };
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
}

module.exports = {
    authenticate,
    optionalAuthenticate,
    requireScope,
    requireAdmin
};
