import { Router } from 'express'
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../services/templatesService.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(getAllTemplates())
})

router.get('/:id', (req, res) => {
  const template = getTemplateById(req.params.id)
  if (!template) {
    return res.status(404).json({ message: 'Template not found' })
  }
  res.json(template)
})

router.post('/', (req, res) => {
  const template = createTemplate(req.body ?? {})
  res.status(201).json(template)
})

router.put('/:id', (req, res) => {
  const template = updateTemplate(req.params.id, req.body ?? {})
  if (!template) {
    return res.status(404).json({ message: 'Template not found' })
  }
  res.json(template)
})

router.delete('/:id', (req, res) => {
  const removed = deleteTemplate(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Template not found' })
  }
  res.status(204).end()
})

export default router
