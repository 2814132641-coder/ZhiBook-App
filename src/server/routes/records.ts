import { Router, Request, Response } from 'express'
import { getDb, persist } from '../db.js'
import type { CreateRecordInput, ListRecordsQuery, RecordItem, UpdateRecordInput } from '../shared/api/index'

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

export const recordsRouter = Router()

recordsRouter.get('/', (req: Request, res: Response) => {
  const q: ListRecordsQuery = {}
  if (typeof req.query.month === 'string') q.month = req.query.month
  if (typeof req.query.keyword === 'string') q.keyword = req.query.keyword
  if (req.query.categoryId) q.categoryId = Number(req.query.categoryId)

  const db = getDb()
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
  if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
  sql += ` ORDER BY r.occurred_at DESC, r.id DESC`

  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Row[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Row)
  stmt.free()
  res.json(rows.map(rowToRecord))
})

recordsRouter.post('/', (req: Request, res: Response) => {
  const input = req.body as CreateRecordInput
  const db = getDb()
  const stmt = db.prepare(
    'INSERT INTO records (amount, category_id, note, occurred_at) VALUES (?, ?, ?, ?)'
  )
  stmt.run([input.amount, input.categoryId, input.note ?? null, input.occurredAt])
  stmt.free()
  // sql.js 1.11+：stmt.run() 返回 true，改用 SQL last_insert_rowid()
  const idRes = db.exec('SELECT last_insert_rowid() AS id')
  const id = Number(idRes[0].values[0][0])
  persist()

  const r = db.exec(`${BASE_SELECT} WHERE r.id = ${id}`)
  if (!r[0]) {
    res.status(500).json({ error: 'insert succeeded but select failed' })
    return
  }
  const { columns, values } = r[0]
  const obj = {} as Row
  columns.forEach((c, i) => ((obj as unknown as Record<string, unknown>)[c] = values[0][i]))
  res.json(rowToRecord(obj))
})

recordsRouter.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const input = { ...(req.body as UpdateRecordInput), id }
  const db = getDb()
  const stmt = db.prepare(
    `UPDATE records SET amount = ?, category_id = ?, note = ?, occurred_at = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
  )
  stmt.run([input.amount, input.categoryId, input.note ?? null, input.occurredAt, id])
  stmt.free()
  persist()

  const r = db.exec(`${BASE_SELECT} WHERE r.id = ${id}`)
  if (!r[0]) {
    res.status(500).json({ error: 'update succeeded but select failed' })
    return
  }
  const { columns, values } = r[0]
  const obj = {} as Row
  columns.forEach((c, i) => ((obj as unknown as Record<string, unknown>)[c] = values[0][i]))
  res.json(rowToRecord(obj))
})

recordsRouter.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const db = getDb()
  const stmt = db.prepare('DELETE FROM records WHERE id = ?')
  stmt.run([id])
  stmt.free()
  persist()
  res.status(204).end()
})