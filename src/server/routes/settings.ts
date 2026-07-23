import { Router, Request, Response } from 'express'
import { writeFileSync } from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'
import { getDb, persist } from '../db.js'

/** CSV 字段转义 */
function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const settingsRouter = Router()

settingsRouter.post('/export', (_req: Request, res: Response) => {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT r.id, r.occurred_at, r.amount, c.name AS category, c.icon AS icon, r.note, r.created_at
    FROM records r
    JOIN categories c ON r.category_id = c.id
    ORDER BY r.occurred_at DESC, r.id DESC
  `)
  const rows: (string | number | null)[][] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    rows.push([
      row.id as number,
      row.occurred_at as string,
      row.amount as number,
      row.category as string,
      (row.icon as string) ?? '',
      (row.note as string) ?? '',
      row.created_at as string
    ])
  }
  stmt.free()

  const header = ['ID', '发生时间', '金额', '分类', '图标', '备注', '创建时间']
  const lines = [header.map(csvEscape).join(',')]
  for (const r of rows) lines.push(r.map(csvEscape).join(','))
  const csv = '﻿' + lines.join('\n')

  const ts = dayjs().format('YYYYMMDD_HHmmss')
  const fileName = `light-ledger-${ts}.csv`
  // 与 db.ts 一致：用 DB_DIR 派生 export 路径，避免污染项目根 data/
  const exportDir = process.env.DB_DIR ?? join(process.cwd(), 'data')
  const filePath = join(exportDir, fileName)

  // 写入服务端 data/ 目录；桌面端可在 IPC 桥里加下载对话框
  writeFileSync(filePath, csv, 'utf-8')
  res.json({ path: filePath })
})

settingsRouter.post('/clear', (_req: Request, res: Response) => {
  const db = getDb()
  db.exec('DELETE FROM records; DELETE FROM settings;')
  persist()
  res.status(204).end()
})