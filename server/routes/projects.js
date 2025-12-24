import { Router } from 'express'
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projectsService.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(getAllProjects())
})

router.get('/:id', (req, res) => {
  const project = getProjectById(req.params.id)
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }
  res.json(project)
})

router.post('/', (req, res) => {
  const project = createProject(req.body ?? {})
  res.status(201).json(project)
})

router.put('/:id', (req, res) => {
  const project = updateProject(req.params.id, req.body ?? {})
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }
  res.json(project)
})

router.delete('/:id', (req, res) => {
  const removed = deleteProject(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Project not found' })
  }
  res.status(204).end()
})

export default router
