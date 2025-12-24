import express from 'express'
import cors from 'cors'
import projectsRouter from './routes/projects.js'
import templatesRouter from './routes/templates.js'
import generationsRouter from './routes/generations.js'
import assetsRouter from './routes/assets.js'
import brandPresetsRouter from './routes/brandPresets.js'
import workflowsRouter from './routes/workflows.js'
import { initDatabase } from './db/database.js'

const app = express()
const port = process.env.PORT || 5124

initDatabase()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/projects', projectsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/generations', generationsRouter)
app.use('/api/assets', assetsRouter)
app.use('/api/brand-presets', brandPresetsRouter)
app.use('/api/workflows', workflowsRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
