import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { log } from './log'

const DEBUG = process.env.LIGHT_LEDGER_DEBUG === '1' || process.env.NODE_ENV !== 'production'

function dbg(msg: string): void {
  if (!DEBUG) return
  try {
    // Prefer userData when available, otherwise fallback to CWD
    const base = app && app.isReady() ? app.getPath('userData') : process.cwd()
    const p = join(base, '__dbg.log')
    writeFileSync(p, `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' })
  } catch {}
}

// remove noisy startup dbg when not in debug mode
if (DEBUG) dbg('=== module top ===')

const isDev = !app.isPackaged

let serverProcess: ReturnType<typeof spawn> | null = null

process.on('uncaughtException', (e) => {
  console.log('[main] UNCAUGHT:', e?.message ?? String(e))
  log('UNCAUGHT: ' + (e?.stack ?? e?.message ?? String(e)))
})
process.on('unhandledRejection', (e) => {
  console.log('[main] UNHANDLED:', (e as Error)?.message ?? String(e))
  log('UNHANDLED: ' + ((e as Error)?.stack ?? String(e)))
})

log('=== main starting ===')

/** 检测后端服务是否已在运行（用户手动启动） */
async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:5210/health')
    return res.ok
  } catch {
    return false
  }
}

/** 提示用户启动 server（如果未运行） */
function showServerHint(): number {
  const { dialog } = require('electron')
  const res = dialog.showMessageBoxSync({
    type: 'info',
    title: '后端服务未运行',
    message: '未检测到本地后端服务 (http://127.0.0.1:5210).',
    detail:
      '你可以：\n\n1) 运行开发服务（开发时）: 在项目根目录运行 `npm run server:dev`。\n2) 打开应用的设置页面查看帮助或选择继续（可能功能受限）。',
    buttons: ['尝试启动（仅开发）', '继续（离线/只读）', '退出']
  })
  return res
}

async function trySpawnDevServer(): Promise<boolean> {
  try {
    // Spawn the development server (works when Node & npm available and app run from project dir)
    serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'server:dev'], {
      cwd: process.cwd(),
      shell: false,
      detached: false,
      stdio: 'ignore'
    })
    log('spawned dev server process')
    return true
  } catch (e) {
    log('failed to spawn dev server: ' + String(e))
    return false
  }
}

function createWindow(): void {
  dbg('createWindow start')
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: true,
    autoHideMenuBar: true,
    title: '轻账',
    backgroundColor: '#F7F8FA',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  dbg('BrowserWindow created')

  mainWindow.on('ready-to-show', () => {
    log('ready-to-show')
    mainWindow.show()
    dbg('ready-to-show')
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log(`did-fail-load: ${code} ${desc} ${url}`)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load')
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`render-process-gone: ${JSON.stringify(details)}`)
  })
  mainWindow.webContents.on('preload-error', (_e, preloadPath, error) => {
    log(`preload-error: ${preloadPath} ${error.stack ?? error.message}`)
  })
  mainWindow.webContents.on('console-message', (_e, level, msg, line, source) => {
    log(`renderer-console[${level}]: ${msg} (${source}:${line})`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (DEBUG) {
    try {
      writeFileSync(join(app.getPath('userData'), '__app_ready.txt'), 'app.whenReady fired at ' + new Date().toISOString() + '\n', { flag: 'a' })
    } catch {}
  }

  log('app ready')
  app.setAppUserModelId('com.lightledger.app')

  // 检查后端服务是否已在运行
  const running = await isServerRunning()
  log(`server running: ${running}`)
  if (!running) {
    log('server not running, showing hint')
    const choice = showServerHint()
    if (choice === 0) {
      const ok = await trySpawnDevServer()
      if (!ok) {
        const { dialog } = require('electron')
        dialog.showMessageBoxSync({
          type: 'error',
          title: '启动失败',
          message: '尝试启动开发服务失败，请手动在项目目录运行 `npm run server:dev`。'
        })
        app.quit()
        return
      }
      // give the server a moment to start
      const started = await (async () => {
        for (let i = 0; i < 10; i++) {
          // small delay
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 500))
          if (await isServerRunning()) return true
        }
        return false
      })()
      if (!started) {
        log('server did not start in time, proceeding to create window (may be limited)')
      }
    } else if (choice === 1) {
      log('user chose to continue in offline/limited mode')
      // proceed to create window; renderer should handle degraded mode
    } else {
      app.quit()
      return
    }
  }

  log('calling createWindow')
  createWindow()
  log('window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill()
    } catch {}
    serverProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill()
    } catch {}
    serverProcess = null
  }
})
