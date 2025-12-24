import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId, nowIso } from '../utils/ids.js'

export function getAllGenerations() {
  const db = getDb()
  return db.prepare('SELECT data FROM generations').all().map(parseRow)
}

export function getGenerationById(id) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM generations WHERE id = ?').get(id)
  return parseRow(row)
}

export function createGeneration(payload) {
  const db = getDb()
  const id = generateId('gen')
  const now = nowIso()
  const entity = {
    ...payload,
    id,
    createdAt: payload?.createdAt ?? now,
  }
  db.prepare('INSERT INTO generations (id, data) VALUES (?, ?)').run(
    id,
    serializeEntity(entity)
  )
  return entity
}

export function updateGeneration(id, updates) {
  const db = getDb()
  const existing = getGenerationById(id)
  if (!existing) return null
  const entity = { ...existing, ...updates, id }
  db.prepare('UPDATE generations SET data = ? WHERE id = ?').run(
    serializeEntity(entity),
    id
  )
  return entity
}

export function deleteGeneration(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM generations WHERE id = ?').run(id)
  return result.changes > 0
}
