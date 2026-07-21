import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync, existsSync } from 'fs'
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

// 通过名字查 categoryId（避免硬编码）
async function catId(name: string): Promise<number> {
  const { getDb } = await import('../db')
  const res = getDb().exec(`SELECT id FROM categories WHERE name = '${name}' LIMIT 1`)
  return res[0].values[0][0] as number
}

describe('records IPC handlers', () => {
  beforeEach(async () => {
    handlers.clear()
    userDataDir = mkdtempSync(join(tmpdir(), 'records-test-'))
    vi.resetModules()
    const { initDb } = await import('../db')
    await initDb()
    const { registerRecordIpc } = await import('./records')
    registerRecordIpc()
  })

  it('records:create 插入一条并返回完整 RecordItem', async () => {
    const handler = get('records:create')
    const id = await catId('日常三餐')
    const result = await handler({}, {
      amount: 88.5,
      categoryId: id,
      note: '午餐',
      occurredAt: '2026-07-18T12:00:00',
    })
    expect(result.id).toBeGreaterThan(0)
    expect(result.amount).toBe(88.5)
    expect(result.categoryId).toBe(id)
    expect(result.note).toBe('午餐')
    expect(result.categoryName).toBe('日常三餐')
    expect(result.categoryIcon).toBe('🍚')
  })

  it('records:create 不传 note → note = null', async () => {
    const handler = get('records:create')
    const id = await catId('日常三餐')
    const result = await handler({}, {
      amount: 10,
      categoryId: id,
      occurredAt: '2026-07-18T12:00:00',
    })
    expect(result.note).toBeNull()
  })

  it('records:update 修改已有记录', async () => {
    const create = get('records:create')
    const update = get('records:update')
    const foodId = await catId('日常三餐')
    const transportId = await catId('公共交通')
    const created = await create({}, {
      amount: 10,
      categoryId: foodId,
      occurredAt: '2026-07-18T12:00:00',
    })
    const updated = await update({}, {
      id: created.id,
      amount: 99,
      categoryId: transportId,
      note: '地铁',
      occurredAt: '2026-07-18T13:00:00',
    })
    expect(updated.amount).toBe(99)
    expect(updated.categoryId).toBe(transportId)
    expect(updated.categoryName).toBe('公共交通')
    expect(updated.note).toBe('地铁')
  })

  it('records:delete 删除后 list 不再包含该 id', async () => {
    const create = get('records:create')
    const del = get('records:delete')
    const list = get('records:list')
    const id = await catId('日常三餐')
    const r = await create({}, {
      amount: 5,
      categoryId: id,
      occurredAt: '2026-07-18T12:00:00',
    })
    expect((await list({}, {})).length).toBe(1)
    await del({}, r.id)
    expect((await list({}, {})).length).toBe(0)
  })

  it('records:list 无 query → 全部', async () => {
    const create = get('records:create')
    const list = get('records:list')
    const id = await catId('日常三餐')
    for (let i = 0; i < 3; i++) {
      await create({}, {
        amount: i + 1,
        categoryId: id,
        occurredAt: '2026-07-18T12:00:00',
      })
    }
    const all = await list({}, {})
    expect(all.length).toBe(3)
  })

  it('records:list 按 month 过滤', async () => {
    const create = get('records:create')
    const list = get('records:list')
    const id = await catId('日常三餐')
    await create({}, { amount: 1, categoryId: id, occurredAt: '2026-07-18T12:00:00' })
    await create({}, { amount: 2, categoryId: id, occurredAt: '2026-08-01T12:00:00' })
    const july = await list({}, { month: '2026-07' })
    expect(july.length).toBe(1)
    expect(july[0].amount).toBe(1)
  })

  it('records:list 按 categoryId 过滤', async () => {
    const create = get('records:create')
    const list = get('records:list')
    const foodId = await catId('日常三餐')
    const transportId = await catId('公共交通')
    await create({}, { amount: 1, categoryId: foodId, occurredAt: '2026-07-18T12:00:00' })
    await create({}, { amount: 2, categoryId: transportId, occurredAt: '2026-07-18T13:00:00' })
    const transport = await list({}, { categoryId: transportId })
    expect(transport.length).toBe(1)
    expect(transport[0].categoryName).toBe('公共交通')
  })

  it('records:list keyword 模糊匹配 note + categoryName', async () => {
    const create = get('records:create')
    const list = get('records:list')
    const foodId = await catId('日常三餐')
    const coffeeId = await catId('咖啡奶茶')
    const transportId = await catId('公共交通')
    await create({}, {
      amount: 1, categoryId: coffeeId,
      note: '拿铁', occurredAt: '2026-07-18T09:00:00',
    })
    await create({}, {
      amount: 2, categoryId: transportId,
      note: '地铁', occurredAt: '2026-07-18T10:00:00',
    })
    await create({}, {
      amount: 3, categoryId: foodId,
      note: '咖啡店午餐', occurredAt: '2026-07-18T12:00:00',
    })
    // keyword='咖啡' 匹配 2 条：note 含咖啡（咖啡店午餐）+ category 含咖啡（咖啡奶茶）
    const byKwd = await list({}, { keyword: '咖啡' })
    expect(byKwd.length).toBe(2)
    // keyword='公共' 只匹配 categoryName='公共交通'
    const byCategory = await list({}, { keyword: '公共' })
    expect(byCategory.length).toBe(1)
    expect(byCategory[0].categoryName).toBe('公共交通')
  })

  it('records:list 默认按 occurredAt DESC, id DESC', async () => {
    const create = get('records:create')
    const list = get('records:list')
    const id = await catId('日常三餐')
    await create({}, { amount: 1, categoryId: id, occurredAt: '2026-07-18T08:00:00' })
    await create({}, { amount: 2, categoryId: id, occurredAt: '2026-07-18T12:00:00' })
    await create({}, { amount: 3, categoryId: id, occurredAt: '2026-07-18T10:00:00' })
    const all = await list({}, {})
    expect(all.map((r: any) => r.amount)).toEqual([2, 3, 1])
  })

  it('records:create 持久化到 db 文件', async () => {
    const create = get('records:create')
    const id = await catId('日常三餐')
    await create({}, { amount: 1, categoryId: id, occurredAt: '2026-07-18T12:00:00' })
    expect(existsSync(join(userDataDir, 'light-ledger.db'))).toBe(true)
  })
})
