import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { writeFileSync, appendFileSync } from 'fs'
import { log } from './log'

function dbg(msg: string): void {
  try {
    writeFileSync('D:\\__dbg.log', `[${new Date().toISOString()}] ${msg}\n`, { flag: 'a' })
  } catch {}
}

dbg('=== module top ===')

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
function showServerHint(): void {
  const { dialog } = require('electron')
  dialog.showMessageBoxSync({
    type: 'info',
    title: '需要后端服务',
    message: '请先启动后端服务',
    detail: '请在另一个终端运行：\n\ncd d:/记账App\nnode src/server/dist/index.js\n\n然后重新打开本应用。',
    buttons: ['知道了']
  })
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
  // 早期调试：写文件确认主进程到了这里
  try {
    require('fs').writeFileSync('D:\\__app_ready.txt', 'app.whenReady fired at ' + new Date().toISOString() + '\n')
  } catch {}

  log('app ready')
  app.setAppUserModelId('com.lightledger.app')

  // 检查后端服务是否已在运行
  const running = await isServerRunning()
  log(`server running: ${running}`)
  try {
    require('fs').appendFileSync('D:\\__app_ready.txt', 'server running: ' + running + '\n')
  } catch {}
  if (!running) {
    log('server not running, showing hint')
    showServerHint()
    app.quit()
    return
  }

  try {
    require('fs').appendFileSync('D:\\__app_ready.txt', 'about to createWindow\n')
  } catch {}
  log('calling createWindow')
  createWindow()
  log('window created')
  try {
    require('fs').appendFileSync('D:\\__app_ready.txt', 'window created\n')
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})