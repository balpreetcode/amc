import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId } from '../utils/ids.js'

export function getAllTemplates() {
  const db = getDb()
  return db.prepare('SELECT data FROM templates').all().map(parseRow)
}

export function getTemplateById(id) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM templates WHERE id = ?').get(id)
  return parseRow(row)
}

export function createTemplate(payload) {
  const db = getDb()
  const id = generateId('tpl')
  const entity = { ...payload, id }
  db.prepare('INSERT INTO templates (id, data) VALUES (?, ?)').run(
    id,
    serializeEntity(entity)
  )
  return entity
}

export function updateTemplate(id, updates) {
  const db = getDb()
  const existing = getTemplateById(id)
  if (!existing) return null
  const entity = { ...existing, ...updates, id }
  db.prepare('UPDATE templates SET data = ? WHERE id = ?').run(
    serializeEntity(entity),
    id
  )
  return entity
}

export function deleteTemplate(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id)
  return result.changes > 0
}
