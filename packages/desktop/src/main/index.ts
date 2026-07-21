import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { log } from './log'

let serverProcess: ReturnType<typeof spawn> | null = null

process.on('uncaughtException', (e) => {
  log('UNCAUGHT: ' + (e?.stack ?? e?.message ?? String(e)))
})
process.on('unhandledRejection', (e) => {
  log('UNHANDLED: ' + ((e as Error)?.stack ?? String(e)))
})

log('=== main starting ===')

/** 启动后端服务子进程 */
function startServer(): void {
  const serverEntry = is.dev
    ? join(__dirname, '../../server/dist/index.js')
    : join(process.resourcesPath, 'server/index.js')

  log(`starting server: ${serverEntry}`)
  serverProcess = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: '5210', DB_DIR: join(app.getPath('userData'), 'light-ledger') },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  serverProcess.stdout?.on('data', (d) => log(`[server] ${d.toString().trim()}`))
  serverProcess.stderr?.on('data', (d) => log(`[server:err] ${d.toString().trim()}`))
  serverProcess.on('exit', (code) => log(`[server] exited with code ${code}`))
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
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

  mainWindow.on('ready-to-show', () => {
    log('ready-to-show')
    mainWindow.show()
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  log('app ready')
  electronApp.setAppUserModelId('com.lightledger.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 启动后端服务
  startServer()
  // 等后端就绪
  await new Promise((r) => setTimeout(r, 1500))

  createWindow()
  log('window created')

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