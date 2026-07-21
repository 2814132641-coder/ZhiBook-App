import dayjs from 'dayjs'

export function formatAmount(n: number): string {
  return `¥${n.toFixed(2)}`
}

export function currentMonth(): string {
  return dayjs().format('YYYY-MM')
}

export function nowIso(): string {
  // 本地时间 ISO 字符串
  return dayjs().format('YYYY-MM-DDTHH:mm:ss')
}

export function formatDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD')
}