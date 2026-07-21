import { ipcMain } from 'electron'
import { getDb, persist } from '../db'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../shared/types'

export function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as number,
    parentId: (row.parent_id as number | null) ?? null,
    name: row.name as string,
    icon: (row.icon as string) ?? '',
    color: (row.color as string) ?? '',
    sortOrder: (row.sort_order as number) ?? 0
  }
}

export function registerCategoryIpc(): void {
  ipcMain.handle('categories:list', () => {
    const db = getDb()
    const res = db.exec('SELECT id, parent_id, name, icon, color, sort_order FROM categories ORDER BY sort_order, id')
    if (res.length === 0) return []
    const { columns, values } = res[0]
    return values.map((v) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((c, i) => (obj[c] = v[i]))
      return rowToCategory(obj)
    })
  })

  ipcMain.handle('categories:create', (_e, input: CreateCategoryInput) => {
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
    ]) as unknown as { lastInsertRowid: number; changes: number }
    stmt.free()
    const id = Number(result.lastInsertRowid)
    persist()
    return { id, ...input, sortOrder: maxSort + 1 }
  })

  ipcMain.handle('categories:update', (_e, input: UpdateCategoryInput) => {
    const db = getDb()
    const stmt = db.prepare(
      'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?'
    )
    stmt.run([input.name, input.icon ?? '', input.color ?? '', input.id])
    stmt.free()
    persist()
    return input
  })

  ipcMain.handle('categories:delete', (_e, id: number) => {
    const db = getDb()
    // 一级分类不可删
    const check = db.prepare('SELECT parent_id FROM categories WHERE id = ?')
    const row = check.get([id]) as unknown as { parent_id: number | null } | undefined
    check.free()
    if (!row) throw new Error('分类不存在')
    if (row.parent_id === null) throw new Error('一级分类不可删除')

    // 删二级分类前，相关 records 一并删除（保持数据一致）
    const tx = db.exec('BEGIN')
    void tx
    try {
      const delRec = db.prepare('DELETE FROM records WHERE category_id = ?')
      delRec.run([id])
      delRec.free()
      const delCat = db.prepare('DELETE FROM categories WHERE id = ?')
      delCat.run([id])
      delCat.free()
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
    persist()
  })
}