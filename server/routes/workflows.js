import { Router } from 'express'
import {
  getAllWorkflows,
  getWorkflowById,
  getWorkflowsByProjectId,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../services/workflowsService.js'

const router = Router()

router.get('/', (req, res) => {
  const { projectId } = req.query
  if (projectId) {
    return res.json(getWorkflowsByProjectId(projectId))
  }
  return res.json(getAllWorkflows())
})

router.get('/:id', (req, res) => {
  const workflow = getWorkflowById(req.params.id)
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' })
  }
  res.json(workflow)
})

router.post('/', (req, res) => {
  const workflow = createWorkflow(req.body ?? {})
  res.status(201).json(workflow)
})

router.put('/:id', (req, res) => {
  const workflow = updateWorkflow(req.params.id, req.body ?? {})
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' })
  }
  res.json(workflow)
})

router.delete('/:id', (req, res) => {
  const removed = deleteWorkflow(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Workflow not found' })
  }
  res.status(204).end()
})

export default router
