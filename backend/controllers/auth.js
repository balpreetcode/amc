const { createUser, validateCredentials, findUserById } = require('../models/user');
const { createApiKey, getApiKeysByUserId, deleteApiKey } = require('../models/api-key');
const {
    createRefreshToken,
    findRefreshToken,
    deleteRefreshToken,
    deleteUserRefreshTokens
} = require('../models/refresh-token');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Register a new user
 */
async function register(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Email, password, and name are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        const user = createUser({ email, password, name, role: 'user' });

        // Generate tokens
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        createRefreshToken(user.id, refreshToken, expiresAt);

        res.json({
            user,
            accessToken,
            refreshToken
        });
    } catch (error) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
}

/**
 * Login user
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = validateCredentials(email, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        createRefreshToken(user.id, refreshToken, expiresAt);

        res.json({
            user,
            accessToken,
            refreshToken
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
}

/**
 * Logout user
 */
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            deleteRefreshToken(refreshToken);
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
}

/**
 * Refresh access token
 */
async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const tokenRecord = findRefreshToken(refreshToken);

        if (!tokenRecord) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Check if expired
        if (new Date(tokenRecord.expiresAt) < new Date()) {
            deleteRefreshToken(refreshToken);
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        const user = findUserById(tokenRecord.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new access token
        const accessToken = generateAccessToken({ userId: user.id, email: user.email });

        res.json({ accessToken });
    } catch (error) {
        res.status(500).json({ error: 'Token refresh failed' });
    }
}

/**
 * Get current user
 */
async function me(req, res) {
    try {
        const { password, ...userWithoutPassword } = req.user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
}

/**
 * Create API key
 */
async function createKey(req, res) {
    try {
        const { name, scopes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'API key name is required' });
        }

        const validScopes = ['read', 'write', 'execute', 'admin'];
        const keyScopes = scopes || ['read'];

        // Validate scopes
        for (const scope of keyScopes) {
            if (!validScopes.includes(scope)) {
                return res.status(400).json({ error: `Invalid scope: ${scope}` });
            }
        }

        const apiKey = createApiKey(req.user.id, name, keyScopes);

        res.json(apiKey);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create API key' });
    }
}

/**
 * List user API keys
 */
async function listKeys(req, res) {
    try {
        const keys = getApiKeysByUserId(req.user.id);

        // Don't return key hashes
        const safeKeys = keys.map(({ keyHash, ...rest }) => rest);

        res.json(safeKeys);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list API keys' });
    }
}

/**
 * Delete API key
 */
async function deleteKey(req, res) {
    try {
        const { id } = req.params;

        const deleted = deleteApiKey(id, req.user.id);

        if (!deleted) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete API key' });
    }
}

module.exports = {
    register,
    login,
    logout,
    refresh,
    me,
    createKey,
    listKeys,
    deleteKey
};
