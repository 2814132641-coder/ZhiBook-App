import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import type { CategorySummary, MonthlySummary } from '@zhibook/shared'

export const statsRouter = Router()

statsRouter.get('/monthly', (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  const m = month.match(/^(\d{4})-(\d{2})$/)
  if (!m) {
    res.status(400).json({ error: 'month must be YYYY-MM' })
    return
  }
  const year = Number(m[1])
  const monthNum = Number(m[2])
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const db = getDb()

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
  const raw: { cid: number; cname: string; cicon: string; ccolor: string; total: number }[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    raw.push({
      cid: row.cid as number,
      cname: row.cname as string,
      cicon: (row.cicon as string) ?? '',
      ccolor: (row.ccolor as string) ?? '',
      total: row.total as number
    })
  }
  stmt.free()

  const totalSum = raw.reduce((s, x) => s + x.total, 0)
  const byCategory: CategorySummary[] = raw.map((x) => ({
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

  const summary: MonthlySummary = {
    month,
    total: Math.round(totalSum * 100) / 100,
    count,
    avgPerDay: Math.round((totalSum / daysInMonth) * 100) / 100,
    byCategory
  }
  res.json(summary)
})