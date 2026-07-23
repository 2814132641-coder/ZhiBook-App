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
  const r: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(c) { this.statusCode = c; return this },
    json(p) { this.body = p; this.ended = true; return this },
    end() { this.ended = true; return this },
  }
  return r
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
  process.env.DB_DIR = mkdtempSync(join(tmpdir(), 'server-cat-test-'))
  vi.resetModules()
  const db = await import('../db')
  await db.initDb()
  return db
}

async function catId(name: string): Promise<number> {
  const { getDb } = await import('../db')
  const res = getDb().exec(`SELECT id FROM categories WHERE name = '${name}' LIMIT 1`)
  return res[0].values[0][0] as number
}

describe('server categories route', () => {
  let router: any

  beforeEach(async () => {
    await initFreshDb()
    router = (await import('./categories')).categoriesRouter
  })

  it('GET / 返回 86 条种子', () => {
    const handler = getHandler(router, 'get', '/')
    const res = makeRes()
    handler({} as Request, res as unknown as Response, (() => {}) as NextFunction)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(86)
  })

  it('POST / 新增一级分类 → 201 + 正确 id', () => {
    const handler = getHandler(router, 'post', '/')
    const res = makeRes()
    handler(
      { body: { parentId: null, name: '测试一级', icon: '🧪', color: '#FF0000' } } as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.statusCode).toBe(201)
    expect(typeof res.body.id).toBe('number')
    expect(res.body.id).toBeGreaterThan(0)
    expect(res.body.name).toBe('测试一级')
  })

  it('POST / 新增二级分类（parentId 非 null）', async () => {
    const handler = getHandler(router, 'post', '/')
    const parentId = await catId('餐饮')
    const res = makeRes()
    handler(
      { body: { parentId, name: '测试二级', icon: '🧪', color: '#00FF00' } } as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.body.id).toBeGreaterThan(0)
    expect(res.body.parentId).toBe(parentId)
  })

  it('POST / 不传 icon/color → 写库用空串（验证数据库层默认）', async () => {
    const handler = getHandler(router, 'post', '/')
    const res = makeRes()
    handler(
      { body: { parentId: null, name: '无图标分类' } } as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.statusCode).toBe(201)
    const newId = res.body.id
    const { getDb } = await import('../db')
    const r = getDb().exec(`SELECT icon, color FROM categories WHERE id = ${newId}`)
    expect(r[0].values[0][0]).toBe('')
    expect(r[0].values[0][1]).toBe('')
  })

  it('PUT /:id 修改名称 + icon + color', () => {
    const post = getHandler(router, 'post', '/')
    const postRes = makeRes()
    post(
      { body: { parentId: null, name: '原名', icon: '🅰️', color: '#000' } } as Request,
      postRes as unknown as Response,
      (() => {}) as NextFunction
    )
    const newId = postRes.body.id

    const put = getHandler(router, 'put', '/:id')
    const putRes = makeRes()
    put(
      { params: { id: String(newId) }, body: { parentId: null, name: '新名', icon: '🅱️', color: '#FFF' } } as unknown as Request,
      putRes as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(putRes.statusCode).toBe(200)
    expect(putRes.body.id).toBe(newId)
    expect(putRes.body.name).toBe('新名')
  })

  it('DELETE /:id 一级分类 → 400', async () => {
    const handler = getHandler(router, 'delete', '/:id')
    const parentId = await catId('餐饮')
    const res = makeRes()
    handler(
      { params: { id: String(parentId) } } as unknown as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('一级分类不可删除')
  })

  it('DELETE /:id 不存在的 id → 404', () => {
    const handler = getHandler(router, 'delete', '/:id')
    const res = makeRes()
    handler(
      { params: { id: '99999' } } as unknown as Request,
      res as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('分类不存在')
  })

  it('DELETE /:id 二级 + 关联 records 一并删除 → 204', async () => {
    const parentId = await catId('餐饮')
    const post = getHandler(router, 'post', '/')
    const postRes = makeRes()
    post(
      { body: { parentId, name: '临时二级', icon: '📦', color: '#999' } } as Request,
      postRes as unknown as Response,
      (() => {}) as NextFunction
    )
    const newId = postRes.body.id
    expect(postRes.body.parentId).toBe(parentId) // 确认是二级

    const { getDb } = await import('../db')
    getDb().exec(
      `INSERT INTO records (amount, category_id, note, occurred_at) VALUES (50, ${newId}, 'x', '2026-07-18T10:00:00')`
    )

    const del = getHandler(router, 'delete', '/:id')
    const delRes = makeRes()
    del(
      { params: { id: String(newId) } } as unknown as Request,
      delRes as unknown as Response,
      (() => {}) as NextFunction
    )
    expect(delRes.statusCode).toBe(204)
    const r = getDb().exec(`SELECT COUNT(*) AS c FROM records WHERE category_id = ${newId}`)
    expect((r[0].values[0][0] as number)).toBe(0)
  })
})