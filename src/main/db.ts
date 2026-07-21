import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { seedCategories } from './seed'

let SQL: SqlJsStatic | null = null
let db: Database | null = null
let dbPath = ''

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES categories(id),
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  note        TEXT,
  occurred_at TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_records_occurred_at ON records(occurred_at);
CREATE INDEX IF NOT EXISTS idx_records_category    ON records(category_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`

export async function initDb(): Promise<void> {
  const userData = app.getPath('userData')
  if (!existsSync(userData)) mkdirSync(userData, { recursive: true })
  dbPath = join(userData, 'light-ledger.db')

  // 定位 wasm 文件
  SQL = await initSqlJs({
    locateFile: (file: string) => join(__dirname, '../../node_modules/sql.js/dist/', file)
  })

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(new Uint8Array(fileBuffer))
  } else {
    db = new SQL.Database()
  }

  db.exec(SCHEMA_SQL)

  // 检查并写入/升级种子分类
  const result = db.exec('SELECT COUNT(*) as cnt FROM categories')
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0
  const totalSeedExpected = 10 + 76 // 10 一级 + 76 二级

  // 检测是否需要升级分类色（看「餐饮」一级分类的色）
  const foodColorRes = db.exec(
    "SELECT color FROM categories WHERE name = '餐饮' AND parent_id IS NULL LIMIT 1"
  )
  const currentFoodColor = foodColorRes[0]?.values[0]?.[0] as string | undefined
  const needsColorUpgrade = !currentFoodColor || currentFoodColor === '#E67E22' // 旧色

  if (count === 0) {
    // 全新数据库
    seedCategories(db)
    persist()
  } else if (count < totalSeedExpected || needsColorUpgrade) {
    // 数据库已有但分类色是旧的，或分类数 < 76 → 走迁移
    migrateCategoriesToV2(db)
    persist()
  }
}

/**
 * 升级到 76 二级版本：备份旧 id→name，重 seed，按 name 映射回 records.category_id
 * sql.js 默认不强制外键，所以可以先删 categories 再 UPDATE records，最后再 seed
 */
function migrateCategoriesToV2(db: Database): void {
  // 1. 备份旧 id → name 映射（仅二级）
  const oldRes = db.exec('SELECT id, name FROM categories WHERE parent_id IS NOT NULL')
  const oldMap = new Map<number, string>()
  if (oldRes.length > 0) {
    for (const v of oldRes[0].values) oldMap.set(v[0] as number, v[1] as string)
  }

  // 2. 清空 categories（records.category_id 暂时指向旧 id）
  db.exec('DELETE FROM categories')

  // 3. 重新 seed
  seedCategories(db)

  // 4. 建新 name → id 映射（仅二级）
  const newRes = db.exec('SELECT id, name FROM categories WHERE parent_id IS NOT NULL')
  const newMap = new Map<string, number>()
  if (newRes.length > 0) {
    for (const v of newRes[0].values) newMap.set(v[1] as string, v[0] as number)
  }

  // 5. 把 records.category_id 从旧映射到新；旧 name 不在新表里 → 归到「其他杂项」
  const fallback = newMap.get('其他杂项') ?? newMap.values().next().value
  if (fallback === undefined) return
  for (const [oldId, oldName] of oldMap.entries()) {
    const newId = newMap.get(oldName) ?? fallback
    const stmt = db.prepare('UPDATE records SET category_id = ? WHERE category_id = ?')
    stmt.run([newId, oldId])
    stmt.free()
  }
}

export function getDb(): Database {
  if (!db) throw new Error('DB not initialized')
  return db
}

export function persist(): void {
  if (!db) return
  const data = db.export()
  // 用 Buffer 写盘，Node fs.writeFileSync 支持 Uint8Array
  writeFileSync(dbPath, Buffer.from(data))
}

export function closeDb(): void {
  if (db) {
    try {
      persist()
    } catch (e) {
      console.error('persist on close failed', e)
    }
    db.close()
    db = null
  }
}