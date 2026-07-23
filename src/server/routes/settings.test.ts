import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Request, Response, NextFunction } from 'express'

interface MockRes {
  statusCode: number
  body: any
  ended: boolean
  status: (c: number) => MockRes
  json: (p: any) => MockRes
  end: () => MockRes
}
function makeRes(): MockRes {
  return {
    statusCode: 200, body: undefined, ended: false,
    status(c) { this.statusCode = c; return this },
    json(p) { this.body = p; this.ended = true; return this },
    end() { this.ended = true; return this },
  }
}
function getHandler(router: any, method: string, path: string) {
  for (const layer of router.stack) {
    if (layer.route?.path === path && layer.route.methods[method.toLowerCase()]) {
      return layer.route.stack[0].handle
    }
  }
  throw new Error(`handler not found: ${method} ${path}`)
}
async function initFreshDb() {
  process.env.DB_DIR = mkdtempSync(join(tmpdir(), 'server-set-test-'))
  vi.resetModules()
  const db = await import('../db')
  await db.initDb()
  return db
}
async function catId(name: string): Promise<number> {
  const { getDb } = await import('../db')
  const r = getDb().exec(`SELECT id FROM categories WHERE name = '${name}' LIMIT 1`)
  return r[0].values[0][0] as number
}

describe('server settings route', () => {
  let router: any
  beforeEach(async () => {
    await initFreshDb()
    router = (await import('./settings')).settingsRouter
  })

  it('POST /export 无 records → CSV 只有 header', () => {
    const handler = getHandler(router, 'post', '/export')
    const res = makeRes()
    handler({} as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(200)
    expect(res.body.path).toMatch(/light-ledger-.*\.csv$/)
    expect(existsSync(res.body.path)).toBe(true)
    const content = readFileSync(res.body.path, 'utf-8')
    expect(content.charCodeAt(0)).toBe(0xfeff) // BOM
    expect(content).toContain('ID')
    expect(content).toContain('金额')
    const lines = content.replace(/^﻿/, '').split('\n')
    expect(lines.length).toBe(1)
  })

  it('POST /export 含 records → CSV 格式正确（含逗号被引号包裹）', async () => {
    const food = await catId('早餐')
    const trans = await catId('公交地铁')
    const { getDb } = await import('../db')
    getDb().exec(
      `INSERT INTO records (amount, category_id, note, occurred_at) VALUES (88.5, ${food}, '午餐', '2026-07-18T12:00:00')`
    )
    getDb().exec(
      `INSERT INTO records (amount, category_id, note, occurred_at) VALUES (5, ${trans}, '地铁, 早高峰', '2026-07-18T09:00:00')`
    )

    const handler = getHandler(router, 'post', '/export')
    const res = makeRes()
    handler({} as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(200)
    const content = readFileSync(res.body.path, 'utf-8').replace(/^﻿/, '')
    const lines = content.split('\n')
    expect(lines[0]).toBe('ID,发生时间,金额,分类,图标,备注,创建时间')
    expect(content).toMatch(/"地铁, 早高峰"/)
    expect(content).toContain('早餐')
    expect(content).toContain('公交地铁')
  })

  it('POST /export CSV 头带 UTF-8 BOM（Excel 兼容）', () => {
    const handler = getHandler(router, 'post', '/export')
    const res = makeRes()
    handler({} as Request, res as unknown as Response, (() => {}) as NextFunction)
    const buf = readFileSync(res.body.path)
    expect(buf[0]).toBe(0xef)
    expect(buf[1]).toBe(0xbb)
    expect(buf[2]).toBe(0xbf)
  })

  it('POST /clear 清空所有 records，categories 保留', async () => {
    const food = await catId('早餐')
    const { getDb } = await import('../db')
    getDb().exec(
      `INSERT INTO records (amount, category_id, note, occurred_at) VALUES (50, ${food}, 'x', '2026-07-18T10:00:00')`
    )
    expect((getDb().exec('SELECT COUNT(*) AS c FROM records')[0].values[0][0] as number)).toBe(1)

    const handler = getHandler(router, 'post', '/clear')
    const res = makeRes()
    handler({} as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(204)
    expect((getDb().exec('SELECT COUNT(*) AS c FROM records')[0].values[0][0] as number)).toBe(0)
    expect((getDb().exec('SELECT COUNT(*) AS c FROM categories')[0].values[0][0] as number)).toBe(86)
  })
})