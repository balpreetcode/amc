import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { schemaStatements } from './schema.js'
import { seedData } from './seedData.js'
import { serializeEntity } from './transform.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')
const dbPath = path.join(dataDir, 'amc2.db')

let dbInstance

export function getDb() {
  if (!dbInstance) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    dbInstance = new Database(dbPath)
    dbInstance.pragma('journal_mode = WAL')
  }
  return dbInstance
}

export function initDatabase() {
  const db = getDb()
  for (const statement of schemaStatements) {
    db.exec(statement)
  }

  const hasProjects = db.prepare('SELECT COUNT(1) AS count FROM projects').get()
  if (hasProjects.count === 0) {
    const insert = db.prepare('INSERT INTO projects (id, data) VALUES (?, ?)')
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, serializeEntity(item))
      }
    })
    transaction(seedData.projects)
  }

  const hasTemplates = db.prepare('SELECT COUNT(1) AS count FROM templates').get()
  if (hasTemplates.count === 0) {
    const insert = db.prepare('INSERT INTO templates (id, data) VALUES (?, ?)')
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, serializeEntity(item))
      }
    })
    transaction(seedData.templates)
  }

  const hasGenerations = db.prepare('SELECT COUNT(1) AS count FROM generations').get()
  if (hasGenerations.count === 0) {
    const insert = db.prepare('INSERT INTO generations (id, data) VALUES (?, ?)')
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, serializeEntity(item))
      }
    })
    transaction(seedData.generations)
  }

  const hasAssets = db.prepare('SELECT COUNT(1) AS count FROM assets').get()
  if (hasAssets.count === 0) {
    const insert = db.prepare('INSERT INTO assets (id, data) VALUES (?, ?)')
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, serializeEntity(item))
      }
    })
    transaction(seedData.assets)
  }

  const hasBrandPresets = db
    .prepare('SELECT COUNT(1) AS count FROM brand_presets')
    .get()
  if (hasBrandPresets.count === 0) {
    const insert = db.prepare('INSERT INTO brand_presets (id, data) VALUES (?, ?)')
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, serializeEntity(item))
      }
    })
    transaction(seedData.brandPresets)
  }

  const hasWorkflows = db.prepare('SELECT COUNT(1) AS count FROM workflows').get()
  if (hasWorkflows.count === 0) {
    const insert = db.prepare(
      'INSERT INTO workflows (id, project_id, data) VALUES (?, ?, ?)'
    )
    const transaction = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.id, item.projectId, serializeEntity(item))
      }
    })
    transaction(seedData.workflows)
  }
}
