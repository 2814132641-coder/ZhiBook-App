import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('server db.ts', () => {
  beforeEach(() => {
    process.env.DB_DIR = mkdtempSync(join(tmpdir(), 'server-db-test-'))
  })

  it('initDb 建新库 + seed 10 一级 + 76 二级 = 86 条', async () => {
    const { initDb, getDb } = await import('./db')
    await initDb()
    const db = getDb()
    const cnt = db.exec('SELECT COUNT(*) AS c FROM categories')[0].values[0][0] as number
    expect(cnt).toBe(86)
    const expectedPath = join(process.env.DB_DIR!, 'light-ledger.db')
    expect(existsSync(expectedPath)).toBe(true)
  })

  it('initDb 第二次调用（库已存在）→ 不重复 seed', async () => {
    const m1 = await import('./db')
    await m1.initDb()
    const first = (m1.getDb().exec('SELECT COUNT(*) AS c FROM categories')[0]
      .values[0][0] as number)
    expect(first).toBe(86)

    const { vi } = await import('vitest')
    vi.resetModules()
    const m2 = await import('./db')
    await m2.initDb()
    const second = (m2.getDb().exec('SELECT COUNT(*) AS c FROM categories')[0]
      .values[0][0] as number)
    expect(second).toBe(86) // 没重复 seed
  })

  it('initDb 写盘后 magic header = "SQLite format"', async () => {
    const { initDb } = await import('./db')
    await initDb()
    const buf = readFileSync(join(process.env.DB_DIR!, 'light-ledger.db'))
    const header = buf.subarray(0, 15).toString('utf-8')
    expect(header).toBe('SQLite format 3')
  })

  it('getDb 未 init 时抛错', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    const { getDb } = await import('./db')
    expect(() => getDb()).toThrow('DB not initialized')
  })

  it('persist 写库到 DB_DIR 路径', async () => {
    const { initDb, getDb, persist } = await import('./db')
    await initDb()
    getDb().exec(
      `INSERT INTO records (amount, category_id, note, occurred_at) VALUES (99.9, 2, 'test', '2026-07-18T10:00:00')`
    )
    persist()
    expect(existsSync(join(process.env.DB_DIR!, 'light-ledger.db'))).toBe(true)
  })

  it('initDb 在指定 DB_DIR 下创建子目录', async () => {
    // DB_DIR 用一个不存在的子目录
    const deep = join(process.env.DB_DIR!, 'a', 'b', 'c')
    process.env.DB_DIR = deep
    const { initDb } = await import('./db')
    await initDb()
    expect(existsSync(join(deep, 'light-ledger.db'))).toBe(true)
  })
})