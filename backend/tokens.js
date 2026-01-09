const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKENS_FILE = path.join(__dirname, 'api-tokens.json');

// Load tokens from file
function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            const data = fs.readFileSync(TOKENS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading tokens:', err);
    }
    return [];
}

// Save tokens to file
function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving tokens:', err);
    }
}

// Generate a new API token
function generateToken(name, expiresInDays = 365) {
    const tokens = loadTokens();

    const token = {
        id: crypto.randomUUID(),
        name: name || 'API Token',
        token: 'wf_' + crypto.randomBytes(32).toString('hex'),
        createdAt: new Date().toISOString(),
        expiresAt: expiresInDays > 0
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
        lastUsed: null
    };

    tokens.push(token);
    saveTokens(tokens);

    return token;
}

// Verify a token
function verifyToken(tokenString) {
    const tokens = loadTokens();
    const token = tokens.find(t => t.token === tokenString);

    if (!token) {
        return { valid: false, reason: 'Invalid token' };
    }

    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
        return { valid: false, reason: 'Token expired' };
    }

    // Update last used timestamp
    token.lastUsed = new Date().toISOString();
    saveTokens(tokens);

    return { valid: true, token };
}

// Get all tokens (without exposing full token string)
function getAllTokens() {
    const tokens = loadTokens();
    return tokens.map(t => ({
        id: t.id,
        name: t.name,
        tokenPreview: t.token.substring(0, 10) + '...',
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        lastUsed: t.lastUsed
    }));
}

// Delete a token
function deleteToken(tokenId) {
    let tokens = loadTokens();
    const initialLength = tokens.length;
    tokens = tokens.filter(t => t.id !== tokenId);
    saveTokens(tokens);
    return tokens.length < initialLength;
}

module.exports = {
    generateToken,
    verifyToken,
    getAllTokens,
    deleteToken
};
