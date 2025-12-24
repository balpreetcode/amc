import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId, nowIso } from '../utils/ids.js'

export function getAllProjects() {
  const db = getDb()
  return db.prepare('SELECT data FROM projects').all().map(parseRow)
}

export function getProjectById(id) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM projects WHERE id = ?').get(id)
  return parseRow(row)
}

export function createProject(payload) {
  const db = getDb()
  const id = generateId('proj')
  const now = nowIso()
  const entity = {
    ...payload,
    id,
    createdAt: payload?.createdAt ?? now,
    updatedAt: payload?.updatedAt ?? now,
  }
  db.prepare('INSERT INTO projects (id, data) VALUES (?, ?)').run(
    id,
    serializeEntity(entity)
  )
  return entity
}

export function updateProject(id, updates) {
  const db = getDb()
  const existing = getProjectById(id)
  if (!existing) return null
  const now = nowIso()
  const entity = {
    ...existing,
    ...updates,
    id,
    updatedAt: now,
  }
  db.prepare('UPDATE projects SET data = ? WHERE id = ?').run(
    serializeEntity(entity),
    id
  )
  return entity
}

export function deleteProject(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return result.changes > 0
}
