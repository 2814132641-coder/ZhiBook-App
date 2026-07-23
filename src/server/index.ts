/**
 * 轻账后端服务 · Express + sql.js
 * 桌面与移动端共用
 * 默认端口 5210（可通过 PORT 环境变量改）
 *
 * 自动端口选择：默认 5210，被占时自动尝试 5211/5212/.../5220。
 * 实际端口同时写入 db.settings 表（key='server_port'）。
 */

import { createServer } from 'net'
import express from 'express'
import cors from 'cors'
import { initDb, getDb, persist } from './db.js'
import { recordsRouter } from './routes/records.js'
import { categoriesRouter } from './routes/categories.js'
import { statsRouter } from './routes/stats.js'
import { settingsRouter } from './routes/settings.js'

const PORT_START = Number(process.env.PORT ?? 5210)
const PORT_END = PORT_START + 10

/** 探测端口是否空闲 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen(port, '127.0.0.1')
  })
}

/** 找第一个可用端口 */
async function findFreePort(start: number, end: number): Promise<number | null> {
  for (let p = start; p <= end; p++) {
    if (await isPortFree(p)) return p
  }
  return null
}

async function main() {
  await initDb()
  console.log('[server] DB initialized')

  const port = await findFreePort(PORT_START, PORT_END)
  if (port === null) {
    console.error(`[server] no free port in range ${PORT_START}-${PORT_END}`)
    process.exit(1)
  }

  // 把实际端口写进 db（client 后续可读 settings/server_port 知道 server 在哪）
  try {
    const db = getDb()
    db.run(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('server_port', ?)`,
      [String(port)]
    )
    persist()
  } catch (e) {
    console.warn('[server] failed to persist server_port to db:', (e as Error).message)
  }

  if (port !== PORT_START) {
    console.warn(
      `[server] port ${PORT_START} is busy; falling back to ${port}. ` +
      `如果 client 仍连 ${PORT_START} 会失败 — 杀掉占 ${PORT_START} 的进程后重启。`
    )
  }

  const app = express()

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type']
    })
  )

  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) =>
    res.json({ ok: true, port, time: new Date().toISOString() })
  )

  app.use('/api/records', recordsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/settings', settingsRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' })
  })

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] error', err)
    res.status(500).json({ error: err.message })
  })

  app.listen(port, '127.0.0.1', () => {
    console.log(`[server] listening on http://127.0.0.1:${port}`)
  })
}

main().catch((e) => {
  console.error('[server] fatal', e)
  process.exit(1)
})