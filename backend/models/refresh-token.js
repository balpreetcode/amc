const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const REFRESH_TOKENS_FILE = path.join(__dirname, '../storage/refresh-tokens.json');

// Ensure storage directory exists
const storageDir = path.dirname(REFRESH_TOKENS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize refresh tokens file if it doesn't exist
if (!fs.existsSync(REFRESH_TOKENS_FILE)) {
    fs.writeFileSync(REFRESH_TOKENS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all refresh tokens
 */
function getAllRefreshTokens() {
    const data = fs.readFileSync(REFRESH_TOKENS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save refresh tokens to file
 */
function saveRefreshTokens(tokens) {
    fs.writeFileSync(REFRESH_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Create a refresh token
 */
function createRefreshToken(userId, token, expiresAt) {
    const tokens = getAllRefreshTokens();

    const tokenRecord = {
        id: uuidv4(),
        userId,
        token,
        expiresAt,
        createdAt: new Date().toISOString()
    };

    tokens.push(tokenRecord);
    saveRefreshTokens(tokens);

    return tokenRecord;
}

/**
 * Find refresh token
 */
function findRefreshToken(token) {
    const tokens = getAllRefreshTokens();
    return tokens.find(t => t.token === token);
}

/**
 * Delete refresh token
 */
function deleteRefreshToken(token) {
    const tokens = getAllRefreshTokens();
    const filtered = tokens.filter(t => t.token !== token);

    saveRefreshTokens(filtered);

    return filtered.length < tokens.length;
}

/**
 * Delete all refresh tokens for a user
 */
function deleteUserRefreshTokens(userId) {
    const tokens = getAllRefreshTokens();
    const filtered = tokens.filter(t => t.userId !== userId);

    saveRefreshTokens(filtered);

    return filtered.length < tokens.length;
}

/**
 * Clean expired tokens
 */
function cleanExpiredTokens() {
    const tokens = getAllRefreshTokens();
    const now = new Date();
    const filtered = tokens.filter(t => new Date(t.expiresAt) > now);

    saveRefreshTokens(filtered);

    return tokens.length - filtered.length;
}

module.exports = {
    createRefreshToken,
    findRefreshToken,
    deleteRefreshToken,
    deleteUserRefreshTokens,
    cleanExpiredTokens
};
