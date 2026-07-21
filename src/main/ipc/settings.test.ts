import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const handlers = vi.hoisted(() => new Map<string, Function>())
const dialogMock = vi.hoisted(() => ({
  showSaveDialog: vi.fn(),
}))

let userDataDir = ''

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: Function) => handlers.set(channel, fn),
  },
  app: {
    getPath: (key: string) => {
      if (key === 'downloads') return join(userDataDir, 'downloads')
      return userDataDir
    },
  },
  dialog: dialogMock,
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

describe('settings IPC handlers', () => {
  beforeEach(async () => {
    handlers.clear()
    dialogMock.showSaveDialog.mockReset()
    userDataDir = mkdtempSync(join(tmpdir(), 'settings-test-'))
    mkdirSync(join(userDataDir, 'downloads'), { recursive: true })
    vi.resetModules()
    const { initDb } = await import('../db')
    await initDb()
    const { registerRecordIpc } = await import('./records')
    const { registerSettingsIpc } = await import('./settings')
    registerRecordIpc()
    registerSettingsIpc()
  })

  it('settings:exportCSV 用户取消时抛错', async () => {
    dialogMock.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: undefined })
    const handler = get('settings:exportCSV')
    await expect(handler({})).rejects.toThrow('已取消导出')
  })

  it('settings:exportCSV 无记录 → CSV 只有 header', async () => {
    // 让 dialog 返回 userDataDir 下的固定路径
    const filePath = join(userDataDir, 'out.csv')
    dialogMock.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath })
    const handler = get('settings:exportCSV')
    const actualPath = await handler({})
    expect(actualPath).toBe(filePath)
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, 'utf-8')
    // BOM
    expect(content.charCodeAt(0)).toBe(0xfeff)
    expect(content).toContain('ID')
    expect(content).toContain('金额')
    const lines = content.replace(/^﻿/, '').split('\n')
    expect(lines.length).toBe(1)
  })

  it('settings:exportCSV 含记录的 CSV 格式', async () => {
    const filePath = join(userDataDir, 'export.csv')
    dialogMock.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath })
    const create = get('records:create')
    const handler = get('settings:exportCSV')
    const food = await catId('日常三餐')
    const transport = await catId('公共交通')
    await create({}, {
      amount: 88.5, categoryId: food,
      note: '午餐', occurredAt: '2026-07-18T12:00:00',
    })
    await create({}, {
      amount: 5, categoryId: transport,
      note: '地铁, 早高峰', occurredAt: '2026-07-18T09:00:00',
    })
    const actualPath = await handler({})
    expect(actualPath).toBe(filePath)
    const content = readFileSync(actualPath, 'utf-8').replace(/^﻿/, '')
    const lines = content.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[0]).toBe('ID,发生时间,金额,分类,图标,备注,创建时间')
    expect(content).toMatch(/"地铁, 早高峰"/)
    expect(content).toContain('日常三餐')
    expect(content).toContain('公共交通')
  })

  it('settings:exportCSV CSV 头带 UTF-8 BOM', async () => {
    const filePath = join(userDataDir, 'bom.csv')
    dialogMock.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath })
    const handler = get('settings:exportCSV')
    await handler({})
    const buf = readFileSync(filePath)
    expect(buf[0]).toBe(0xef)
    expect(buf[1]).toBe(0xbb)
    expect(buf[2]).toBe(0xbf)
  })

  it('settings:clearAll 清空所有 records + 保留 categories', async () => {
    const rCreate = get('records:create')
    const clear = get('settings:clearAll')
    const food = await catId('日常三餐')
    await rCreate({}, { amount: 50, categoryId: food, occurredAt: '2026-07-18T10:00:00' })

    const { getDb } = await import('../db')
    expect((getDb().exec('SELECT COUNT(*) AS c FROM records')[0].values[0][0] as number)).toBe(1)

    await clear({})
    expect((getDb().exec('SELECT COUNT(*) AS c FROM records')[0].values[0][0] as number)).toBe(0)
    expect((getDb().exec('SELECT COUNT(*) AS c FROM categories')[0].values[0][0] as number)).toBe(57)
  })
})
