const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, verifyPassword } = require('../utils/crypto');

const USERS_FILE = path.join(__dirname, '../storage/users.json');

// Ensure storage directory exists
const storageDir = path.dirname(USERS_FILE);
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

/**
 * Get all users
 */
function getAllUsers() {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save users to file
 */
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Create a new user
 */
function createUser({ email, password, name, role = 'user' }) {
    const users = getAllUsers();

    // Check if user already exists
    if (users.find(u => u.email === email)) {
        throw new Error('User with this email already exists');
    }

    const user = {
        id: uuidv4(),
        email,
        password: hashPassword(password),
        name,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Find user by email
 */
function findUserByEmail(email) {
    const users = getAllUsers();
    return users.find(u => u.email === email);
}

/**
 * Find user by ID
 */
function findUserById(id) {
    const users = getAllUsers();
    return users.find(u => u.id === id);
}

/**
 * Validate user credentials
 */
function validateCredentials(email, password) {
    const user = findUserByEmail(email);

    if (!user) {
        return null;
    }

    const isValid = verifyPassword(password, user.password);

    if (!isValid) {
        return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Update user
 */
function updateUser(id, updates) {
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        throw new Error('User not found');
    }

    // Don't allow updating id, email, or createdAt
    const { id: _, email: __, createdAt: ___, ...allowedUpdates } = updates;

    users[index] = {
        ...users[index],
        ...allowedUpdates,
        updatedAt: new Date().toISOString()
    };

    saveUsers(users);

    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    validateCredentials,
    updateUser,
    getAllUsers
};
