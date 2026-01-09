const crypto = require('crypto');

/**
 * Hash a password using PBKDF2
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

/**
 * Generate a random API key
 */
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash an API key for storage
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateApiKey,
    hashApiKey
};
