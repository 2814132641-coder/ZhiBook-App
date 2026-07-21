/**
 * 轻账后端服务 · Express + sql.js
 * 桌面与移动端共用
 * 默认端口 5210（可通过 PORT 环境变量改）
 */

import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import { recordsRouter } from './routes/records.js'
import { categoriesRouter } from './routes/categories.js'
import { statsRouter } from './routes/stats.js'
import { settingsRouter } from './routes/settings.js'

const PORT = Number(process.env.PORT ?? 5210)

async function main() {
  await initDb()
  console.log('[server] DB initialized')

  const app = express()

  // CORS：dev 允许全部；prod 默认同源
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    })
  )

  app.use(express.json({ limit: '1mb' }))

  // 健康检查
  app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))

  // API 路由
  app.use('/api/records', recordsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/settings', settingsRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' })
  })

  // 错误处理
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] error', err)
    res.status(500).json({ error: err.message })
  })

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[server] listening on http://127.0.0.1:${PORT}`)
  })
}

main().catch((e) => {
  console.error('[server] fatal', e)
  process.exit(1)
})