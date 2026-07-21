import { Router, Request, Response } from 'express'
import { getDb, persist } from '../db.js'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@zhibook/shared'

interface Row {
  id: number
  parent_id: number | null
  name: string
  icon: string | null
  color: string | null
  sort_order: number | null
}

function rowToCategory(row: Row): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    icon: row.icon ?? '',
    color: row.color ?? '',
    sortOrder: row.sort_order ?? 0
  }
}

export const categoriesRouter = Router()

categoriesRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const r = db.exec(
    'SELECT id, parent_id, name, icon, color, sort_order FROM categories ORDER BY sort_order, id'
  )
  if (r.length === 0) {
    res.json([])
    return
  }
  const { columns, values } = r[0]
  const rows: Row[] = values.map((v) => {
    const obj = {} as Row
    columns.forEach((c, i) => ((obj as unknown as Record<string, unknown>)[c] = v[i]))
    return obj
  })
  res.json(rows.map(rowToCategory))
})

categoriesRouter.post('/', (req: Request, res: Response) => {
  const input = req.body as CreateCategoryInput
  const db = getDb()
  const maxRes = db.exec('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories')
  const maxSort = (maxRes[0]?.values[0]?.[0] as number) ?? 0
  const stmt = db.prepare(
    'INSERT INTO categories (parent_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  const result = stmt.run([
    input.parentId,
    input.name,
    input.icon ?? '',
    input.color ?? '',
    maxSort + 1
  ]) as unknown as { lastInsertRowid: number | bigint }
  stmt.free()
  const id = Number(result.lastInsertRowid)
  persist()
  res.status(201).json({ id, ...input, sortOrder: maxSort + 1 })
})

categoriesRouter.put('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const input = req.body as UpdateCategoryInput
  const db = getDb()
  const stmt = db.prepare(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?'
  )
  stmt.run([input.name, input.icon ?? '', input.color ?? '', id])
  stmt.free()
  persist()
  res.json({ id, parentId: input.parentId, name: input.name, icon: input.icon, color: input.color })
})

categoriesRouter.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const db = getDb()
  const check = db.prepare('SELECT parent_id FROM categories WHERE id = ?')
  const row = check.get([id]) as unknown as { parent_id: number | null } | undefined
  check.free()
  if (!row) {
    res.status(404).json({ error: '分类不存在' })
    return
  }
  if (row.parent_id === null) {
    res.status(400).json({ error: '一级分类不可删除' })
    return
  }
  // 删除二级分类前，相关 records 一并删除
  const delRec = db.prepare('DELETE FROM records WHERE category_id = ?')
  delRec.run([id])
  delRec.free()
  const delCat = db.prepare('DELETE FROM categories WHERE id = ?')
  delCat.run([id])
  delCat.free()
  persist()
  res.status(204).end()
})