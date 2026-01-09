const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/me', authenticate, authController.me);
router.post('/api-keys', authenticate, authController.createKey);
router.get('/api-keys', authenticate, authController.listKeys);
router.delete('/api-keys/:id', authenticate, authController.deleteKey);

module.exports = router;
