import { Router } from 'express'
import {
  getAllBrandPresets,
  getBrandPresetById,
  createBrandPreset,
  updateBrandPreset,
  deleteBrandPreset,
} from '../services/brandPresetsService.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(getAllBrandPresets())
})

router.get('/:id', (req, res) => {
  const preset = getBrandPresetById(req.params.id)
  if (!preset) {
    return res.status(404).json({ message: 'Brand preset not found' })
  }
  res.json(preset)
})

router.post('/', (req, res) => {
  const preset = createBrandPreset(req.body ?? {})
  res.status(201).json(preset)
})

router.put('/:id', (req, res) => {
  const preset = updateBrandPreset(req.params.id, req.body ?? {})
  if (!preset) {
    return res.status(404).json({ message: 'Brand preset not found' })
  }
  res.json(preset)
})

router.delete('/:id', (req, res) => {
  const removed = deleteBrandPreset(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Brand preset not found' })
  }
  res.status(204).end()
})

export default router
