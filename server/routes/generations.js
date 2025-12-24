import { Router } from 'express'
import {
  getAllGenerations,
  getGenerationById,
  createGeneration,
  updateGeneration,
  deleteGeneration,
} from '../services/generationsService.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(getAllGenerations())
})

router.get('/:id', (req, res) => {
  const generation = getGenerationById(req.params.id)
  if (!generation) {
    return res.status(404).json({ message: 'Generation not found' })
  }
  res.json(generation)
})

router.post('/', (req, res) => {
  const generation = createGeneration(req.body ?? {})
  res.status(201).json(generation)
})

router.put('/:id', (req, res) => {
  const generation = updateGeneration(req.params.id, req.body ?? {})
  if (!generation) {
    return res.status(404).json({ message: 'Generation not found' })
  }
  res.json(generation)
})

router.delete('/:id', (req, res) => {
  const removed = deleteGeneration(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Generation not found' })
  }
  res.status(204).end()
})

export default router
