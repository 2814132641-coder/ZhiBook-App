import { describe, it, expect } from 'vitest'
import { formatAmount, currentMonth, nowIso, formatDateTime, formatDate } from './format'

describe('formatAmount', () => {
  it('整数补两位小数', () => {
    expect(formatAmount(10)).toBe('¥10.00')
  })
  it('一位小数补 0', () => {
    expect(formatAmount(10.5)).toBe('¥10.50')
  })
  it('两位小数不动', () => {
    expect(formatAmount(10.55)).toBe('¥10.55')
  })
  it('三位小数四舍五入', () => {
    expect(formatAmount(10.555)).toBe('¥10.55') // banker's? toFixed 默认就近舍入
  })
  it('0 显示 ¥0.00', () => {
    expect(formatAmount(0)).toBe('¥0.00')
  })
  it('负数显示负号', () => {
    expect(formatAmount(-3.14)).toBe('¥-3.14')
  })
})

describe('currentMonth', () => {
  it('返回 YYYY-MM 格式字符串', () => {
    const s = currentMonth()
    expect(s).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('nowIso', () => {
  it('返回本地时间 YYYY-MM-DDTHH:mm:ss', () => {
    const s = nowIso()
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatDateTime', () => {
  it('ISO 字符串格式化为 YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime('2026-07-18T10:30:00')).toBe('2026-07-18 10:30')
  })
})

describe('formatDate', () => {
  it('ISO 字符串只取日期部分', () => {
    expect(formatDate('2026-07-18T10:30:00')).toBe('2026-07-18')
  })
})
