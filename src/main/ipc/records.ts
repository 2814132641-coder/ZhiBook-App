import { ipcMain } from 'electron'
import { getDb, persist } from '../db'
import { log } from '../log'
import type {
  CreateRecordInput,
  RecordItem,
  UpdateRecordInput,
  ListRecordsQuery
} from '../../shared/types'

interface Row {
  id: number
  amount: number
  category_id: number
  note: string | null
  occurred_at: string
  created_at: string
  updated_at: string
  category_name?: string
  category_icon?: string
  category_color?: string
}

function rowToRecord(r: Row): RecordItem {
  return {
    id: r.id,
    amount: r.amount,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    categoryColor: r.category_color,
    note: r.note,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

const BASE_SELECT = `
SELECT r.id, r.amount, r.category_id, r.note, r.occurred_at, r.created_at, r.updated_at,
       c.name AS category_name, c.icon AS category_icon, c.color AS category_color
FROM records r
JOIN categories c ON r.category_id = c.id
`

export function registerRecordIpc(): void {
  ipcMain.handle('records:create', (_e, input: CreateRecordInput) => {
    const db = getDb()
    try {
      log(`records:create input: amount=${input.amount} categoryId=${input.categoryId} note=${input.note}`)
      const stmt = db.prepare(
        'INSERT INTO records (amount, category_id, note, occurred_at) VALUES (?, ?, ?, ?)'
      )
      const result = stmt.run([
        input.amount,
        input.categoryId,
        input.note ?? null,
        input.occurredAt
      ]) as unknown as { lastInsertRowid?: number | bigint; changes?: number }
      stmt.free()
      log(`records:create stmt.run result: ${JSON.stringify(result)}`)

      // 用 last_insert_rowid() 作为单一来源（更可靠）
      const r = db.exec('SELECT last_insert_rowid() AS id')
      log(`records:create last_insert_rowid raw: ${JSON.stringify(r)}`)
      const realId = r[0] && r[0].values[0] ? Number(r[0].values[0][0]) : 0
      log(`records:create realId=${realId}`)
      if (!realId) throw new Error('insert failed: last_insert_rowid returned 0')

      persist()

      const res = db.exec(`${BASE_SELECT} WHERE r.id = ${realId}`)
      log(`records:create select result keys=${res.length} first.rows=${res[0]?.values?.length}`)
      if (!res[0]) throw new Error('select after insert returned no rows')
      const { columns, values } = res[0]
      const obj = {} as Row
      columns.forEach((c, i) => ((obj as unknown as Record<string, unknown>)[c] = values[0][i]))
      return rowToRecord(obj)
    } catch (e) {
      log('records:create ERROR: ' + (e instanceof Error ? e.stack : String(e)))
      throw e
    }
  })

  ipcMain.handle('records:update', (_e, input: UpdateRecordInput) => {
    const db = getDb()
    const stmt = db.prepare(
      `UPDATE records SET amount = ?, category_id = ?, note = ?, occurred_at = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
    )
    stmt.run([input.amount, input.categoryId, input.note ?? null, input.occurredAt, input.id])
    stmt.free()
    persist()
    const res = db.exec(`${BASE_SELECT} WHERE r.id = ${input.id}`)
    const { columns, values } = res[0]
    const obj = {} as Row
    columns.forEach((c, i) => ((obj as unknown as Record<string, unknown>)[c] = values[0][i]))
    return rowToRecord(obj)
  })

  ipcMain.handle('records:delete', (_e, id: number) => {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM records WHERE id = ?')
    stmt.run([id])
    stmt.free()
    persist()
  })

  ipcMain.handle('records:list', (_e, query?: ListRecordsQuery) => {
    const db = getDb()
    const q = query ?? {}
    const conds: string[] = []
    const params: (string | number)[] = []

    if (q.month) {
      conds.push(`strftime('%Y-%m', r.occurred_at) = ?`)
      params.push(q.month)
    }
    if (q.categoryId) {
      conds.push(`r.category_id = ?`)
      params.push(q.categoryId)
    }
    if (q.keyword) {
      conds.push(`(r.note LIKE ? OR c.name LIKE ?)`)
      const kw = `%${q.keyword}%`
      params.push(kw, kw)
    }

    let sql = BASE_SELECT
    if (conds.length > 0) {
      sql += ` WHERE ${conds.join(' AND ')}`
    }
    sql += ` ORDER BY r.occurred_at DESC, r.id DESC`

    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: Row[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as Row)
    }
    stmt.free()
    return rows.map(rowToRecord)
  })
}