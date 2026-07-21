import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let tmpDir = ''

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((key: string) => {
      if (key === 'userData') return tmpDir
      return tmpDir
    }),
  },
}))

describe('db.ts', () => {
  beforeEach(() => {
    vi.resetModules()
    tmpDir = mkdtempSync(join(tmpdir(), 'light-ledger-test-'))
  })

  it('initDb 不存在 db 文件 → 创建新库 + seed 57 条 categories', async () => {
    const { initDb, getDb } = await import('./db')
    await initDb()
    const db = getDb()
    const res = db.exec('SELECT COUNT(*) AS cnt FROM categories')
    expect((res[0].values[0][0] as number)).toBe(57)
    // 数据库文件应被持久化
    const dbPath = join(tmpDir, 'light-ledger.db')
    expect(existsSync(dbPath)).toBe(true)
  })

  it('initDb 第二次调用（db 文件已存在）→ 不重复 seed', async () => {
    // 第一次：建库 + seed
    const m1 = await import('./db')
    await m1.initDb()
    const firstCount = (m1.getDb().exec('SELECT COUNT(*) AS cnt FROM categories')[0]
      .values[0][0] as number)
    expect(firstCount).toBe(57)

    // 重新 resetModules，模拟重新启动
    vi.resetModules()
    const m2 = await import('./db')
    await m2.initDb()
    const secondCount = (m2.getDb().exec('SELECT COUNT(*) AS cnt FROM categories')[0]
      .values[0][0] as number)
    // 仍然 57，不重复 seed
    expect(secondCount).toBe(57)
  })

  it('initDb 写盘后 sqlite 文件 magic header = "SQLite format"', async () => {
    const { initDb } = await import('./db')
    await initDb()
    const buf = readFileSync(join(tmpDir, 'light-ledger.db'))
    const header = buf.subarray(0, 15).toString('utf-8')
    expect(header).toBe('SQLite format 3')
  })

  it('getDb 未 init 时抛错', async () => {
    const { getDb } = await import('./db')
    expect(() => getDb()).toThrow('DB not initialized')
  })

  it('persist 未 init 时静默返回', async () => {
    const { persist } = await import('./db')
    expect(() => persist()).not.toThrow()
  })

  it('closeDb 后 getDb 抛错；再次 closeDb 不抛错', async () => {
    const { initDb, getDb, closeDb } = await import('./db')
    await initDb()
    expect(() => getDb()).not.toThrow()
    closeDb()
    expect(() => getDb()).toThrow('DB not initialized')
    expect(() => closeDb()).not.toThrow()
  })

  it('closeDb 会持久化挂起的修改', async () => {
    const m1 = await import('./db')
    await m1.initDb()
    const db = m1.getDb()
    db.exec("INSERT INTO records (amount, category_id, note, occurred_at) VALUES (99.9, 1, 'test', '2026-07-18T10:00:00')")
    m1.closeDb()

    vi.resetModules()
    const m2 = await import('./db')
    await m2.initDb()
    const res = m2.getDb().exec("SELECT amount FROM records WHERE note = 'test'")
    expect((res[0].values[0][0] as number)).toBeCloseTo(99.9, 1)
  })

  // 清理
  afterAll?.(() => {
    // vitest 在每个文件结束后清理 tmpDir 即可
  })
})

// 全文件跑完清掉所有 tmp
{
  // 简易 cleanup：每个 tmpDir 标记在 OS 层
  // vitest 测试结束后 OS 会自动清理 /tmp
}
