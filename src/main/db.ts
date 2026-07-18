import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'

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

  // 检查并写入种子分类
  const result = db.exec('SELECT COUNT(*) as cnt FROM categories')
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0
  if (count === 0) {
    const { seedCategories } = await import('./seed')
    seedCategories(db)
    persist()
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