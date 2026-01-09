const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executions');
const { authenticate, requireScope } = require('../middleware/auth');

// All execution routes require authentication
router.use(authenticate);

router.get('/', executionController.listExecutions);
router.get('/:id', executionController.getDetails);
router.get('/:id/nodes', executionController.getNodes);
router.get('/:id/logs', executionController.getLogs);
router.post('/:id/retry', requireScope('execute'), executionController.retry);

module.exports = router;
