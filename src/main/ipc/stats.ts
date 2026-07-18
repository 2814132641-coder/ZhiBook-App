import { ipcMain } from 'electron'
import { getDb } from '../db'
import type { CategorySummary, MonthlySummary } from '../../shared/types'

export function registerStatsIpc(): void {
  ipcMain.handle('stats:monthlySummary', (_e, month: string): MonthlySummary => {
    const db = getDb()
    // month = 'YYYY-MM'
    const [year, m] = month.split('-').map(Number)
    const daysInMonth = new Date(year, m, 0).getDate()

    const stmt = db.prepare(`
      SELECT c.id AS cid, c.name AS cname, c.icon AS cicon, c.color AS ccolor,
             COALESCE(SUM(r.amount), 0) AS total
      FROM categories c
      LEFT JOIN records r
        ON r.category_id = c.id
       AND strftime('%Y-%m', r.occurred_at) = ?
       AND c.parent_id IS NOT NULL
      WHERE c.parent_id IS NOT NULL
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `)
    stmt.bind([month])
    const byCategoryRaw: { cid: number; cname: string; cicon: string; ccolor: string; total: number }[] =
      []
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>
      byCategoryRaw.push({
        cid: row.cid as number,
        cname: row.cname as string,
        cicon: (row.cicon as string) ?? '',
        ccolor: (row.ccolor as string) ?? '',
        total: row.total as number
      })
    }
    stmt.free()

    const totalSum = byCategoryRaw.reduce((s, x) => s + x.total, 0)
    const byCategory: CategorySummary[] = byCategoryRaw.map((x) => ({
      categoryId: x.cid,
      categoryName: x.cname,
      categoryIcon: x.cicon,
      categoryColor: x.ccolor,
      amount: x.total,
      percent: totalSum > 0 ? Math.round((x.total / totalSum) * 1000) / 10 : 0
    }))

    const countRes = db.exec(
      `SELECT COUNT(*) AS cnt FROM records WHERE strftime('%Y-%m', occurred_at) = '${month}'`
    )
    const count = (countRes[0]?.values[0]?.[0] as number) ?? 0

    return {
      month,
      total: Math.round(totalSum * 100) / 100,
      count,
      avgPerDay: Math.round((totalSum / daysInMonth) * 100) / 100,
      byCategory
    }
  })
}