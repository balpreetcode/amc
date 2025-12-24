import { getDb } from '../db/database.js'
import { parseRow, serializeEntity } from '../db/transform.js'
import { generateId, nowIso } from '../utils/ids.js'

export function getAllWorkflows() {
  const db = getDb()
  return db.prepare('SELECT data FROM workflows').all().map(parseRow)
}

export function getWorkflowById(id) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM workflows WHERE id = ?').get(id)
  return parseRow(row)
}

export function getWorkflowsByProjectId(projectId) {
  const db = getDb()
  return db
    .prepare('SELECT data FROM workflows WHERE project_id = ?')
    .all(projectId)
    .map(parseRow)
}

export function createWorkflow(payload) {
  const db = getDb()
  const id = generateId('wf')
  const now = nowIso()
  const entity = {
    ...payload,
    id,
    createdAt: payload?.createdAt ?? now,
    updatedAt: payload?.updatedAt ?? now,
  }
  db.prepare('INSERT INTO workflows (id, project_id, data) VALUES (?, ?, ?)').run(
    id,
    payload.projectId,
    serializeEntity(entity)
  )
  return entity
}

export function updateWorkflow(id, updates) {
  const db = getDb()
  const existing = getWorkflowById(id)
  if (!existing) return null
  const now = nowIso()
  const entity = { ...existing, ...updates, id, updatedAt: now }
  db.prepare('UPDATE workflows SET data = ?, project_id = ? WHERE id = ?').run(
    serializeEntity(entity),
    entity.projectId,
    id
  )
  return entity
}

export function deleteWorkflow(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
  return result.changes > 0
}
