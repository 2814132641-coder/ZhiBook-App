import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export function log(msg: string): void {
  try {
    const dir = join(tmpdir(), 'light-ledger')
    mkdirSync(dir, { recursive: true })
    const p = join(dir, 'startup.log')
    appendFileSync(p, `[${new Date().toISOString()}] ${msg}\n`)
  } catch (e) {
    // 写失败时尝试写桌面
    try {
      appendFileSync('D:\\__debug_log.txt', `[${new Date().toISOString()}] ${msg} (err: ${(e as Error)?.message})\n`)
    } catch {
      // ignore
    }
  }
}