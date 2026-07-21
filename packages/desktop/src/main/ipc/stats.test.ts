import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const handlers = vi.hoisted(() => new Map<string, Function>())
let userDataDir = ''

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: Function) => handlers.set(channel, fn),
  },
  app: {
    getPath: () => userDataDir,
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
}))

const get = (channel: string) => {
  const h = handlers.get(channel)
  if (!h) throw new Error(`handler not registered: ${channel}`)
  return h
}

async function catId(name: string): Promise<number> {
  const { getDb } = await import('../db')
  const res = getDb().exec(`SELECT id FROM categories WHERE name = '${name}' LIMIT 1`)
  return res[0].values[0][0] as number
}

describe('stats IPC handlers', () => {
  beforeEach(async () => {
    handlers.clear()
    userDataDir = mkdtempSync(join(tmpdir(), 'stats-test-'))
    vi.resetModules()
    const { initDb } = await import('../db')
    await initDb()
    const { registerRecordIpc } = await import('./records')
    const { registerStatsIpc } = await import('./stats')
    registerRecordIpc()
    registerStatsIpc()
  })

  it('stats:monthlySummary 空月份 total/count=0', async () => {
    const handler = get('stats:monthlySummary')
    const summary = await handler({}, '2026-07')
    expect(summary.month).toBe('2026-07')
    expect(summary.total).toBe(0)
    expect(summary.count).toBe(0)
    expect(summary.avgPerDay).toBe(0)
    expect(summary.byCategory).toEqual([])
  })

  it('stats:monthlySummary 统计本月总额与笔数', async () => {
    const create = get('records:create')
    const handler = get('stats:monthlySummary')
    const food = await catId('日常三餐')
    const transport = await catId('公共交通')
    await create({}, { amount: 100, categoryId: food, occurredAt: '2026-07-10T08:00:00' })
    await create({}, { amount: 50, categoryId: food, occurredAt: '2026-07-15T12:00:00' })
    await create({}, { amount: 30, categoryId: transport, occurredAt: '2026-07-18T09:00:00' })
    // 不应计入下月
    await create({}, { amount: 999, categoryId: food, occurredAt: '2026-08-01T09:00:00' })

    const summary = await handler({}, '2026-07')
    expect(summary.month).toBe('2026-07')
    expect(summary.total).toBe(180)
    expect(summary.count).toBe(3)
    expect(summary.byCategory.length).toBe(2)
  })

  it('stats:monthlySummary byCategory 按金额降序', async () => {
    const create = get('records:create')
    const handler = get('stats:monthlySummary')
    const food = await catId('日常三餐')
    const coffee = await catId('咖啡奶茶')
    await create({}, { amount: 20, categoryId: coffee, occurredAt: '2026-07-18T08:00:00' })
    await create({}, { amount: 100, categoryId: food, occurredAt: '2026-07-18T12:00:00' })
    const summary = await handler({}, '2026-07')
    expect(summary.byCategory[0].categoryName).toBe('日常三餐')
    expect(summary.byCategory[0].amount).toBe(100)
    expect(summary.byCategory[1].categoryName).toBe('咖啡奶茶')
    expect(summary.byCategory[1].amount).toBe(20)
  })

  it('stats:monthlySummary percent 加起来接近 100', async () => {
    const create = get('records:create')
    const handler = get('stats:monthlySummary')
    const food = await catId('日常三餐')
    const coffee = await catId('咖啡奶茶')
    await create({}, { amount: 30, categoryId: food, occurredAt: '2026-07-18T08:00:00' })
    await create({}, { amount: 70, categoryId: coffee, occurredAt: '2026-07-18T12:00:00' })
    const summary = await handler({}, '2026-07')
    const sumPercent = summary.byCategory.reduce((s: number, c: any) => s + c.percent, 0)
    // 30 + 70 = 100；由于四舍五入可能差 0.1-0.2
    expect(Math.abs(sumPercent - 100)).toBeLessThan(1)
  })

  it('stats:monthlySummary avgPerDay = total / 该月天数', async () => {
    const create = get('records:create')
    const handler = get('stats:monthlySummary')
    const food = await catId('日常三餐')
    // 2026-07 有 31 天
    await create({}, { amount: 310, categoryId: food, occurredAt: '2026-07-18T08:00:00' })
    const summary = await handler({}, '2026-07')
    expect(summary.avgPerDay).toBe(10)  // 310 / 31
  })

  it('stats:monthlySummary byCategory 只包含有支出的二级', async () => {
    const create = get('records:create')
    const handler = get('stats:monthlySummary')
    const food = await catId('日常三餐')
    await create({}, { amount: 50, categoryId: food, occurredAt: '2026-07-18T08:00:00' })
    const summary = await handler({}, '2026-07')
    // 只应有 1 个 byCategory（餐饮→日常三餐），其他 56 个分类无支出
    expect(summary.byCategory.length).toBe(1)
    expect(summary.byCategory[0].categoryName).toBe('日常三餐')
  })
})
