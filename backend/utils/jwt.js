const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generate an access token
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate a refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verify a token
 */
function verifyToken(token) {
    try {
        return { valid: true, payload: jwt.verify(token, JWT_SECRET) };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken
};
