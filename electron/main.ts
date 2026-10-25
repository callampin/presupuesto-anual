/**
 * Proceso principal de Electron.
 *
 * En producción no abre ningún puerto: sirve la API de Hono y el frontend
 * compilado mediante el protocolo interno `app://`. La base SQLite vive en
 * `app.getPath('userData')` (AppData en Windows, ~/.config en Linux).
 */

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
  shell,
  type MenuItemConstructorOptions,
} from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_SCHEME,
  APP_URL,
  createAppProtocolHandler,
} from './protocol'

const APP_NAME = 'Presupuesto Personal'
const APP_ID = 'com.saga.presupuesto'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')
const devRendererUrl = process.env.ELECTRON_RENDERER_URL
const isDev = Boolean(devRendererUrl)

app.setName(APP_NAME)
if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

interface AppPaths {
  dataDir: string
  dbPath: string
  distDir: string
  migrationsDir: string
  iconPath: string
  logPath: string
}

interface DatabaseHandle {
  sqlite: { close(): void }
}

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  maximized?: boolean
}

let mainWindow: BrowserWindow | null = null
let connection: DatabaseHandle | null = null
let windowStatePath = ''
let logFilePath = ''
let protocolInstalled = false
let backupBridgeInstalled = false

function resolvePaths(): AppPaths {
  const dataDir = app.getPath('userData')
  return {
    dataDir,
    dbPath: path.join(dataDir, 'finanzas.db'),
    distDir: path.join(projectRoot, 'dist'),
    migrationsDir: app.isPackaged
      ? path.join(process.resourcesPath, 'migrations')
      : path.join(projectRoot, 'drizzle'),
    iconPath: app.isPackaged
      ? path.join(process.resourcesPath, 'icon.png')
      : path.join(projectRoot, 'build', 'icon.png'),
    logPath: path.join(dataDir, 'logs', 'main.log'),
  }
}

function logLine(message: string): void {
  const timestamp = new Date().toISOString()
  try {
    if (logFilePath) {
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
      fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`, 'utf8')
    }
  } catch {
    // El log no debe impedir el arranque.
  }
  console.log(`[main] ${message}`)
}

function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(windowStatePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WindowState>
    if (
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number' &&
      parsed.width >= 900 &&
      parsed.height >= 600
    ) {
      return {
        width: Math.round(parsed.width),
        height: Math.round(parsed.height),
        x: typeof parsed.x === 'number' ? Math.round(parsed.x) : undefined,
        y: typeof parsed.y === 'number' ? Math.round(parsed.y) : undefined,
        maximized: Boolean(parsed.maximized),
      }
    }
  } catch {
    // Primer arranque o estado corrupto.
  }
  return { width: 1440, height: 900 }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getNormalBounds()
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: win.isMaximized(),
    }
    fs.writeFileSync(windowStatePath, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // No es crítico.
  }
}

/** Copia de seguridad previa a abrir/migrar la base. Conserva las últimas 5. */
async function backupDatabase(dbPath: string): Promise<void> {
  if (!fs.existsSync(dbPath)) return
  const backupDir = path.join(path.dirname(dbPath), 'backups')
  let source: { backup(path: string): Promise<unknown>; close(): void } | null = null
  try {
    const Database = (await import('better-sqlite3')).default
    source = new Database(dbPath)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const target = path.join(backupDir, `finanzas-${stamp}.db`)
    fs.mkdirSync(backupDir, { recursive: true })
    await source.backup(target)

    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.db'))
      .sort()
    for (const file of files.slice(0, Math.max(0, files.length - 5))) {
      fs.rmSync(path.join(backupDir, file), { force: true })
    }
    logLine(`Copia de seguridad creada: ${target}`)
  } catch (error) {
    logLine(`No se pudo crear la copia de seguridad: ${String(error)}`)
  } finally {
    try {
      source?.close()
    } catch {
      // Ya estaba cerrada.
    }
  }
}

async function openProductionApi(paths: AppPaths) {
  await backupDatabase(paths.dbPath)

  const [{ openDatabase }, { createApp }] = await Promise.all([
    import('../src/server/db'),
    import('../src/server/app'),
  ])

  const dbConnection = openDatabase(paths.dbPath, {
    migrationsDir: paths.migrationsDir,
  })
  connection = dbConnection
  logLine(
    `Base SQLite abierta en ${dbConnection.path} (seed: ${dbConnection.seeded ? 'sí' : 'no'})`,
  )
  return createApp(dbConnection)
}

function isAllowedNavigation(url: string): boolean {
  if (isDev && devRendererUrl) {
    try {
      return new URL(url).origin === new URL(devRendererUrl).origin
    } catch {
      return false
    }
  }
  return url.startsWith(APP_URL)
}

function openExternal(url: string): void {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    void shell.openExternal(url)
  }
}

function installMenu(): void {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null)
    return
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Aplicación',
      submenu: [{ role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function createWindow(paths: AppPaths): Promise<void> {
  const state = loadWindowState()
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#071518',
    title: APP_NAME,
    icon: fs.existsSync(paths.iconPath) ? paths.iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(currentDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow = win
  let rendererReloads = 0
  if (state.maximized) win.maximize()

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', () => saveWindowState(win))
  win.on('closed', () => {
    mainWindow = null
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedNavigation(url)) return
    event.preventDefault()
    openExternal(url)
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    logLine(`El renderer terminó inesperadamente: ${details.reason}`)
    if (details.reason !== 'clean-exit' && rendererReloads < 2) {
      rendererReloads += 1
      logLine(`Recargando la interfaz (intento ${rendererReloads}/2)…`)
      win.reload()
    }
  })

  const target = isDev && devRendererUrl ? devRendererUrl : APP_URL
  logLine(`Cargando interfaz: ${target}`)
  await win.loadURL(target)
}

function installBackupBridge(): void {
  ipcMain.handle(
    'desktop:save-backup',
    async (
      _event,
      payload: { fileName?: unknown; data?: unknown },
    ): Promise<{ saved: boolean; path?: string; error?: string }> => {
      try {
        const fileName =
          typeof payload?.fileName === 'string'
            ? path.basename(payload.fileName)
            : 'respaldo'
        const raw = payload?.data
        let bytes: Buffer
        if (raw instanceof ArrayBuffer) {
          bytes = Buffer.from(raw)
        } else if (ArrayBuffer.isView(raw)) {
          bytes = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)
        } else {
          return { saved: false, error: 'Datos de respaldo inválidos' }
        }

        const extension = path.extname(fileName).toLowerCase()
        const filters =
          extension === '.db'
            ? [{ name: 'Base SQLite', extensions: ['db'] }]
            : [{ name: 'Respaldo JSON', extensions: ['json'] }]

        const options = {
          title: 'Guardar respaldo',
          defaultPath: path.join(app.getPath('documents'), fileName),
          filters,
        }
        const result = mainWindow
          ? await dialog.showSaveDialog(mainWindow, options)
          : await dialog.showSaveDialog(options)
        if (result.canceled || !result.filePath) return { saved: false }

        await fs.promises.writeFile(result.filePath, bytes)
        logLine(`Respaldo guardado en ${result.filePath}`)
        return { saved: true, path: result.filePath }
      } catch (error) {
        logLine(`Error al guardar el respaldo: ${String(error)}`)
        return { saved: false, error: 'No se pudo guardar el archivo' }
      }
    },
  )
}

async function bootstrap(): Promise<void> {
  const paths = resolvePaths()
  windowStatePath = path.join(paths.dataDir, 'window-state.json')
  logFilePath = paths.logPath
  logLine(`Arranque (${isDev ? 'desarrollo' : 'producción'}) · datos: ${paths.dataDir}`)

  if (!isDev) {
    if (!protocolInstalled) {
      const api = await openProductionApi(paths)
      protocol.handle(
        APP_SCHEME,
        createAppProtocolHandler({ distDir: paths.distDir, api }),
      )
      protocolInstalled = true
    }
  }

  if (!backupBridgeInstalled) {
    installBackupBridge()
    backupBridgeInstalled = true
  }
  installMenu()
  await createWindow(paths)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void bootstrap().catch(handleFatalError)
    }
  })

  app.on('before-quit', () => {
    try {
      connection?.sqlite.close()
    } catch {
      // Ya estaba cerrada.
    }
    connection = null
  })

  app.whenReady().then(bootstrap).catch(handleFatalError)
}

function handleFatalError(error: unknown): void {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  logLine(`FATAL: ${message}`)
  dialog.showErrorBox(
    APP_NAME,
    `No se pudo iniciar la aplicación.\n\n${message}\n\nRegistro: ${path.join(
      app.getPath('userData'),
      'logs',
      'main.log',
    )}`,
  )
  app.quit()
}
