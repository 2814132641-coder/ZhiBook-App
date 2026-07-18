import { ipcMain, dialog, app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'
import { getDb, persist, closeDb } from '../db'

function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:exportCSV', async (): Promise<string> => {
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
    const csv = '﻿' + lines.join('\n') // BOM 让 Excel 正确识别 UTF-8

    const ts = dayjs().format('YYYYMMDD_HHmmss')
    const fileName = `light-ledger-${ts}.csv`
    const result = await dialog.showSaveDialog({
      title: '导出 CSV',
      defaultPath: join(app.getPath('downloads'), fileName),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })

    if (result.canceled || !result.filePath) {
      throw new Error('已取消导出')
    }
    writeFileSync(result.filePath, csv, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('settings:clearAll', (): void => {
    const db = getDb()
    db.exec('DELETE FROM records; DELETE FROM settings;')
    persist()
  })
}