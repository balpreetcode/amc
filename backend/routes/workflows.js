const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflows');
const versionController = require('../controllers/versions');
const { authenticate, requireScope } = require('../middleware/auth');

// All workflow routes require authentication
router.use(authenticate);

// Workflow CRUD
router.get('/', workflowController.listWorkflows);
router.post('/', requireScope('write'), workflowController.create);
router.get('/:id', workflowController.getById);
router.put('/:id', requireScope('write'), workflowController.update);
router.delete('/:id', requireScope('write'), workflowController.remove);

// Workflow operations
router.post('/:id/clone', requireScope('write'), workflowController.clone);
router.post('/:id/pause', requireScope('execute'), workflowController.pause);
router.post('/:id/resume', requireScope('execute'), workflowController.resume);
router.post('/:id/cancel', requireScope('execute'), workflowController.cancel);

// Workflow versioning
router.get('/:id/versions', versionController.listVersions);
router.post('/:id/versions', requireScope('write'), versionController.create);
router.get('/:id/versions/:version', versionController.getVersion);
router.post('/:id/versions/:version/restore', requireScope('write'), versionController.restore);

module.exports = router;
