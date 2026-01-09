const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generateApiKey, hashApiKey } = require('../utils/crypto');

const API_KEYS_FILE = path.join(__dirname, '../storage/api-keys.json');

// Ensure storage directory exists
const storageDir = path.dirname(API_KEYS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize api keys file if it doesn't exist
if (!fs.existsSync(API_KEYS_FILE)) {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all API keys
 */
function getAllApiKeys() {
    const data = fs.readFileSync(API_KEYS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save API keys to file
 */
function saveApiKeys(apiKeys) {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
}

/**
 * Create a new API key
 */
function createApiKey(userId, name, scopes = ['read']) {
    const apiKeys = getAllApiKeys();

    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    const keyRecord = {
        id: uuidv4(),
        userId,
        name,
        keyHash: hashedKey,
        scopes,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        expiresAt: null // No expiration by default
    };

    apiKeys.push(keyRecord);
    saveApiKeys(apiKeys);

    // Return the key record with the plaintext key (only time it's shown)
    return {
        ...keyRecord,
        key: apiKey
    };
}

/**
 * Find API key by hash
 */
function findApiKeyByHash(keyHash) {
    const apiKeys = getAllApiKeys();
    return apiKeys.find(k => k.keyHash === keyHash);
}

/**
 * Validate API key
 */
function validateApiKey(apiKey) {
    const keyHash = hashApiKey(apiKey);
    const keyRecord = findApiKeyByHash(keyHash);

    if (!keyRecord) {
        return null;
    }

    // Check if expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        return null;
    }

    // Update last used
    updateLastUsed(keyRecord.id);

    return keyRecord;
}

/**
 * Update last used timestamp
 */
function updateLastUsed(id) {
    const apiKeys = getAllApiKeys();
    const index = apiKeys.findIndex(k => k.id === id);

    if (index !== -1) {
        apiKeys[index].lastUsed = new Date().toISOString();
        saveApiKeys(apiKeys);
    }
}

/**
 * Get API keys for a user
 */
function getApiKeysByUserId(userId) {
    const apiKeys = getAllApiKeys();
    return apiKeys.filter(k => k.userId === userId);
}

/**
 * Delete an API key
 */
function deleteApiKey(id, userId) {
    const apiKeys = getAllApiKeys();
    const index = apiKeys.findIndex(k => k.id === id && k.userId === userId);

    if (index === -1) {
        return false;
    }

    apiKeys.splice(index, 1);
    saveApiKeys(apiKeys);

    return true;
}

module.exports = {
    createApiKey,
    findApiKeyByHash,
    validateApiKey,
    getApiKeysByUserId,
    deleteApiKey
};
