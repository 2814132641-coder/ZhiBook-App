import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { join } from 'path'
import { readFileSync } from 'fs'
import { seedCategories } from './seed'

const SCHEMA = `
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0
);
`

let SQL: SqlJsStatic
let db: Database

beforeAll(async () => {
  SQL = await initSqlJs({
    locateFile: (file: string) =>
      join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  })
  db = new SQL.Database()
  db.exec(SCHEMA)
})

afterAll(() => {
  if (db) db.close()
})

describe('seedCategories', () => {
  it('写入 10 个一级 + 47 个二级 = 共 57 条', () => {
    seedCategories(db)
    const res = db.exec('SELECT COUNT(*) AS cnt FROM categories')
    expect((res[0].values[0][0] as number)).toBe(57)
  })

  it('一级分类 10 个', () => {
    const res = db.exec('SELECT COUNT(*) AS cnt FROM categories WHERE parent_id IS NULL')
    expect((res[0].values[0][0] as number)).toBe(10)
  })

  it('二级分类 47 个', () => {
    const res = db.exec('SELECT COUNT(*) AS cnt FROM categories WHERE parent_id IS NOT NULL')
    expect((res[0].values[0][0] as number)).toBe(47)
  })

  it('包含全部 10 个一级分类名', () => {
    const res = db.exec("SELECT name FROM categories WHERE parent_id IS NULL ORDER BY sort_order")
    const names = res[0].values.map((v) => v[0] as string)
    expect(names).toEqual([
      '餐饮', '交通', '购物', '居住', '娱乐', '医疗', '教育', '通讯', '金融', '其他',
    ])
  })

  it('一级「餐饮」下有 5 个二级', () => {
    const res = db.exec(`
      SELECT COUNT(*) AS cnt FROM categories c
      JOIN categories p ON p.id = c.parent_id
      WHERE p.name = '餐饮'
    `)
    expect((res[0].values[0][0] as number)).toBe(5)
  })

  it('一级「通讯」下有 4 个二级', () => {
    const res = db.exec(`
      SELECT COUNT(*) AS cnt FROM categories c
      JOIN categories p ON p.id = c.parent_id
      WHERE p.name = '通讯'
    `)
    expect((res[0].values[0][0] as number)).toBe(4)
  })

  it('sort_order 单调递增', () => {
    const res = db.exec(
      'SELECT sort_order FROM categories WHERE parent_id IS NULL ORDER BY sort_order'
    )
    const orders = res[0].values.map((v) => v[0] as number)
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1])
    }
  })
})
