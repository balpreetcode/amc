import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId, nowIso } from '../utils/ids.js'

export function getAllAssets() {
  const db = getDb()
  return db.prepare('SELECT data FROM assets').all().map(parseRow)
}

export function getAssetById(id) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM assets WHERE id = ?').get(id)
  return parseRow(row)
}

export function createAsset(payload) {
  const db = getDb()
  const id = generateId('asset')
  const now = nowIso()
  const entity = {
    ...payload,
    id,
    createdAt: payload?.createdAt ?? now,
  }
  db.prepare('INSERT INTO assets (id, data) VALUES (?, ?)').run(
    id,
    serializeEntity(entity)
  )
  return entity
}

export function updateAsset(id, updates) {
  const db = getDb()
  const existing = getAssetById(id)
  if (!existing) return null
  const entity = { ...existing, ...updates, id }
  db.prepare('UPDATE assets SET data = ? WHERE id = ?').run(
    serializeEntity(entity),
    id
  )
  return entity
}

export function deleteAsset(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM assets WHERE id = ?').run(id)
  return result.changes > 0
}
