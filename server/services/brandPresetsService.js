import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId } from '../utils/ids.js'

export function getAllBrandPresets() {
  const db = getDb()
  return db.prepare('SELECT data FROM brand_presets').all().map(parseRow)
}

export function getBrandPresetById(id) {
  const db = getDb()
  const row = db
    .prepare('SELECT data FROM brand_presets WHERE id = ?')
    .get(id)
  return parseRow(row)
}

export function createBrandPreset(payload) {
  const db = getDb()
  const id = generateId('brand')
  const entity = { ...payload, id }
  db.prepare('INSERT INTO brand_presets (id, data) VALUES (?, ?)').run(
    id,
    serializeEntity(entity)
  )
  return entity
}

export function updateBrandPreset(id, updates) {
  const db = getDb()
  const existing = getBrandPresetById(id)
  if (!existing) return null
  const entity = { ...existing, ...updates, id }
  db.prepare('UPDATE brand_presets SET data = ? WHERE id = ?').run(
    serializeEntity(entity),
    id
  )
  return entity
}

export function deleteBrandPreset(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM brand_presets WHERE id = ?').run(id)
  return result.changes > 0
}
