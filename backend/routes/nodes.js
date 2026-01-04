const express = require('express');
const router = express.Router();
const nodeController = require('../controllers/nodes');
const { authenticate, requireScope } = require('../middleware/auth');

// All node routes require authentication
router.use(authenticate);

router.post('/:taskId/rerun', requireScope('execute'), nodeController.rerun);

module.exports = router;
