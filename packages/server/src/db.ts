/**
 * server 端 sql.js 连接与持久化
 * 桌面与移动端共用此后端
 */

import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { SEED_CATEGORIES } from '@zhibook/shared'

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
  // server 数据存放：./data/light-ledger.db（可在启动时通过环境变量改）
  const dataDir = process.env.DB_DIR ?? join(process.cwd(), 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  dbPath = join(dataDir, 'light-ledger.db')

  SQL = await initSqlJs({
    locateFile: (file: string) => {
      // npm workspace hoist：sql.js 在根 node_modules
      const candidates = [
        join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
        join(process.cwd(), '..', '..', 'node_modules', 'sql.js', 'dist', file)
      ]
      for (const p of candidates) {
        if (existsSync(p)) return p
      }
      return candidates[0]
    }
  })

  if (existsSync(dbPath)) {
    db = new SQL.Database(new Uint8Array(readFileSync(dbPath)))
  } else {
    db = new SQL.Database()
  }

  db.exec(SCHEMA_SQL)
  seedIfEmpty(db)
  persist()
}

function seedIfEmpty(db: Database): void {
  const r = db.exec('SELECT COUNT(*) AS cnt FROM categories')
  const cnt = r.length > 0 ? (r[0].values[0][0] as number) : 0
  if (cnt > 0) return

  let sort = 0
  for (const cat of SEED_CATEGORIES) {
    const stmt = db.prepare(
      'INSERT INTO categories (parent_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    stmt.run([null, cat.name, cat.icon, cat.color, sort++])
    stmt.free()
    const idRes = db.exec('SELECT last_insert_rowid() AS id')
    const parentId = idRes[0].values[0][0] as number
    let childSort = 0
    for (const child of cat.children) {
      const cstmt = db.prepare(
        'INSERT INTO categories (parent_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)'
      )
      cstmt.run([parentId, child.name, child.icon, cat.color, childSort++])
      cstmt.free()
    }
  }
}

export function getDb(): Database {
  if (!db) throw new Error('DB not initialized')
  return db
}

export function persist(): void {
  if (!db) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}