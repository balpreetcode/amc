import { Router } from 'express'
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from '../services/assetsService.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(getAllAssets())
})

router.get('/:id', (req, res) => {
  const asset = getAssetById(req.params.id)
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' })
  }
  res.json(asset)
})

router.post('/', (req, res) => {
  const asset = createAsset(req.body ?? {})
  res.status(201).json(asset)
})

router.put('/:id', (req, res) => {
  const asset = updateAsset(req.params.id, req.body ?? {})
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' })
  }
  res.json(asset)
})

router.delete('/:id', (req, res) => {
  const removed = deleteAsset(req.params.id)
  if (!removed) {
    return res.status(404).json({ message: 'Asset not found' })
  }
  res.status(204).end()
})

export default router
