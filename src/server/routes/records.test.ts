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
    statusCode: 200,
    body: undefined,
    ended: false,
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
  process.env.DB_DIR = mkdtempSync(join(tmpdir(), 'server-rec-test-'))
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

describe('server records route', () => {
  let router: any
  beforeEach(async () => {
    await initFreshDb()
    router = (await import('./records')).recordsRouter
  })

  it('POST / 新增一条 → 200 + 含 categoryName（防 lastInsertRowid 回归）', async () => {
    const foodId = await catId('早餐')
    const handler = getHandler(router, 'post', '/')
    const res = makeRes()
    handler(
      { body: { amount: 88.5, categoryId: foodId, note: '午餐', occurredAt: '2026-07-18T12:00:00' } } as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.statusCode).toBe(200)
    expect(typeof res.body.id).toBe('number')
    expect(res.body.id).toBeGreaterThan(0)
    expect(res.body.amount).toBe(88.5)
    expect(res.body.categoryId).toBe(foodId)
    expect(res.body.note).toBe('午餐')
    expect(res.body.categoryName).toBe('早餐')
  })

  it('POST / 不传 note → note = null', async () => {
    const foodId = await catId('早餐')
    const handler = getHandler(router, 'post', '/')
    const res = makeRes()
    handler(
      { body: { amount: 10, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.body.note).toBeNull()
  })

  it('GET / 无 query → 全部', async () => {
    const foodId = await catId('早餐')
    const post = getHandler(router, 'post', '/')
    for (let i = 0; i < 3; i++) {
      post(
        { body: { amount: i + 1, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
        makeRes() as unknown as Response,
        (() => {}) as NextFunction
      )
    }
    const list = getHandler(router, 'get', '/')
    const res = makeRes()
    list({ query: {} } as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.length).toBe(3)
  })

  it('GET / 按 month 过滤', async () => {
    const foodId = await catId('早餐')
    const post = getHandler(router, 'post', '/')
    post(
      { body: { amount: 1, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    post(
      { body: { amount: 2, categoryId: foodId, occurredAt: '2026-08-01T12:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    const list = getHandler(router, 'get', '/')
    const res = makeRes()
    list({ query: { month: '2026-07' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.length).toBe(1)
    expect(res.body[0].amount).toBe(1)
  })

  it('GET / 按 categoryId 过滤', async () => {
    const foodId = await catId('早餐')
    const transId = await catId('公交地铁')
    const post = getHandler(router, 'post', '/')
    post(
      { body: { amount: 1, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    post(
      { body: { amount: 2, categoryId: transId, occurredAt: '2026-07-18T13:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    const list = getHandler(router, 'get', '/')
    const res = makeRes()
    list({ query: { categoryId: transId } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.length).toBe(1)
    expect(res.body[0].categoryName).toBe('公交地铁')
  })

  it('GET / keyword 模糊匹配 note + categoryName', async () => {
    const coffeeId = await catId('咖啡奶茶')
    const foodId = await catId('早餐')
    const transId = await catId('公交地铁')
    const post = getHandler(router, 'post', '/')
    post(
      { body: { amount: 1, categoryId: coffeeId, note: '拿铁', occurredAt: '2026-07-18T09:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    post(
      { body: { amount: 2, categoryId: transId, note: '地铁', occurredAt: '2026-07-18T10:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    post(
      { body: { amount: 3, categoryId: foodId, note: '咖啡店午餐', occurredAt: '2026-07-18T12:00:00' } } as Request,
      makeRes() as unknown as Response,
      (() => {}) as NextFunction
    )
    const list = getHandler(router, 'get', '/')
    const res = makeRes()
    list({ query: { keyword: '咖啡' } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
    // 1 条 note 含咖啡 + 1 条 category 含咖啡（咖啡奶茶）
    expect(res.body.length).toBe(2)
  })

  it('GET / 默认按 occurredAt DESC', async () => {
    const foodId = await catId('早餐')
    const post = getHandler(router, 'post', '/')
    for (const [amount, occ] of [[1, '2026-07-18T08:00:00'], [2, '2026-07-18T12:00:00'], [3, '2026-07-18T10:00:00']]) {
      post(
        { body: { amount, categoryId: foodId, occurredAt: occ } } as Request,
        makeRes() as unknown as Response,
        (() => {}) as NextFunction
      )
    }
    const list = getHandler(router, 'get', '/')
    const res = makeRes()
    list({ query: {} } as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.body.map((r: any) => r.amount)).toEqual([2, 3, 1])
  })

  it('PUT /:id 修改金额 + 分类 + note', async () => {
    const foodId = await catId('早餐')
    const transId = await catId('公交地铁')
    const post = getHandler(router, 'post', '/')
    const created = makeRes()
    post(
      { body: { amount: 10, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
      created as unknown as Response,
      (() => {}) as NextFunction
    )
    const put = getHandler(router, 'put', '/:id')
    const updated = makeRes()
    put(
      { params: { id: String(created.body.id) }, body: { amount: 99, categoryId: transId, note: '地铁', occurredAt: '2026-07-18T13:00:00' } } as unknown as Request,
      updated as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(updated.statusCode).toBe(200)
    expect(updated.body.amount).toBe(99)
    expect(updated.body.categoryName).toBe('公交地铁')
  })

  it('DELETE /:id → 204 且 list 不再含该 id', async () => {
    const foodId = await catId('早餐')
    const post = getHandler(router, 'post', '/')
    const created = makeRes()
    post(
      { body: { amount: 5, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' } } as Request,
      created as unknown as Response,
      (() => {}) as NextFunction
    )
    const del = getHandler(router, 'delete', '/:id')
    const delRes = makeRes()
    del({ params: { id: String(created.body.id) } } as unknown as Request, delRes as unknown as Response, (() => {}) as NextFunction)
    expect(delRes.statusCode).toBe(204)

    const list = getHandler(router, 'get', '/')
    const listRes = makeRes()
    list({ query: {} } as Request, listRes as unknown as Response, (() => {}) as NextFunction)
    expect(listRes.body.length).toBe(0)
  })
})