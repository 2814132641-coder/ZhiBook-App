import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'fs'
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
  process.env.DB_DIR = mkdtempSync(join(tmpdir(), 'server-stat-test-'))
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

describe('server stats route', () => {
  let router: any
  beforeEach(async () => {
    await initFreshDb()
    router = (await import('./stats')).statsRouter
  })

  it('GET /monthly 无 month 参数 → 400', () => {
    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: {} } as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/YYYY-MM/)
  })

  it('GET /monthly 无 records → total=0 count=0', () => {
    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(200)
    expect(res.body.month).toBe('2026-07')
    expect(res.body.total).toBe(0)
    expect(res.body.count).toBe(0)
    expect(res.body.byCategory).toEqual([])
  })

  it('GET /monthly 统计本月总额 + 笔数 + 按金额降序', async () => {
    const food = await catId('早餐')
    const trans = await catId('公交地铁')
    const { getDb } = await import('../db')
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (100, ${food}, 'x', '2026-07-10T08:00:00')`)
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (50, ${food}, 'y', '2026-07-15T12:00:00')`)
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (30, ${trans}, 'z', '2026-07-18T09:00:00')`)
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (999, ${food}, 'w', '2026-08-01T09:00:00')`)

    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(200)
    expect(res.body.total).toBe(180)
    expect(res.body.count).toBe(3)
    expect(res.body.byCategory.length).toBe(2)
    expect(res.body.byCategory[0].categoryName).toBe('早餐')
    expect(res.body.byCategory[0].amount).toBe(150)
    expect(res.body.byCategory[1].categoryName).toBe('公交地铁')
  })

  it('GET /monthly percent 加起来接近 100', async () => {
    const food = await catId('早餐')
    const coffee = await catId('咖啡奶茶')
    const { getDb } = await import('../db')
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (30, ${food}, 'x', '2026-07-18T08:00:00')`)
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (70, ${coffee}, 'y', '2026-07-18T12:00:00')`)
    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    const sumP = res.body.byCategory.reduce((s: number, c: any) => s + c.percent, 0)
    expect(Math.abs(sumP - 100)).toBeLessThan(1)
  })

  it('GET /monthly avgPerDay = total / 该月天数（2026-07 = 31 天）', async () => {
    const food = await catId('早餐')
    const { getDb } = await import('../db')
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (310, ${food}, 'x', '2026-07-18T08:00:00')`)
    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.avgPerDay).toBe(10) // 310/31
  })

  it('GET /monthly byCategory 只包含有支出的二级', async () => {
    const food = await catId('早餐')
    const { getDb } = await import('../db')
    getDb().exec(`INSERT INTO records (amount, category_id, note, occurred_at) VALUES (50, ${food}, 'x', '2026-07-18T08:00:00')`)
    const handler = getHandler(router, 'get', '/monthly')
    const res = makeRes()
    handler({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.byCategory.length).toBe(1)
    expect(res.body.byCategory[0].categoryName).toBe('早餐')
  })
})