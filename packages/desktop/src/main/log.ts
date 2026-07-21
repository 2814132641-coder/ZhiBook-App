import { app } from 'electron'
import { appendFileSync } from 'fs'
import { join } from 'path'

export function log(msg: string): void {
  try {
    const p = join(app.getPath('userData'), 'startup.log')
    appendFileSync(p, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {
    // ignore
  }
}