import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb, closeDb } from './db'
import { log } from './log'
import { registerRecordIpc } from './ipc/records'
import { registerCategoryIpc } from './ipc/categories'
import { registerStatsIpc } from './ipc/stats'
import { registerSettingsIpc } from './ipc/settings'

process.on('uncaughtException', (e) => {
  log('UNCAUGHT: ' + (e?.stack ?? e?.message ?? String(e)))
})
process.on('unhandledRejection', (e) => {
  log('UNHANDLED: ' + ((e as Error)?.stack ?? String(e)))
})

log('=== main starting ===')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: '轻账',
    backgroundColor: '#FAFAF7',
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

  try {
    log('initDb start')
    await initDb()
    log('initDb ok')
    registerRecordIpc()
    log('records ipc ok')
    registerCategoryIpc()
    log('categories ipc ok')
    registerStatsIpc()
    log('stats ipc ok')
    registerSettingsIpc()
    log('settings ipc ok')
  } catch (e) {
    log('init error: ' + (e instanceof Error ? e.stack : String(e)))
    throw e
  }

  createWindow()
  log('window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDb()
})