#!/usr/bin/env node
/**
 * Orquestador del entorno de desarrollo.
 *
 * Problema que resuelve: al lanzar `pnpm dev` con una instancia anterior aún
 * viva, el servidor de la API moría con `EADDRINUSE` y Vite se desplazaba a
 * otro puerto. Este script:
 *
 *  - Detiene la instancia anterior de ESTE proyecto (registrada en
 *    `.dev-instance.json`) antes de arrancar, liberando los puertos.
 *  - Si el puerto de la API está ocupado por otro programa, usa el siguiente
 *    libre y le pasa ese destino al proxy de Vite.
 *  - Si detecta una API de este proyecto que no registró (por ejemplo, porque
 *    se arrancó con `pnpm dev:server`), la reutiliza en lugar de duplicarla.
 *  - Cierra ambos procesos con Ctrl+C / SIGTERM / SIGHUP.
 *
 * Uso:
 *   pnpm dev                 # arranca o reinicia el entorno
 *   pnpm dev:stop            # detiene la instancia registrada
 *   PORT=4000 pnpm dev       # cambia el puerto de la API
 *   CLIENT_PORT=5180 pnpm dev
 */

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'
const stateFile = path.join(rootDir, '.dev-instance.json')

const parsedApiPort = Number(process.env.PORT ?? 3001)
const parsedClientPort = Number(process.env.CLIENT_PORT ?? 5173)
const apiPort = Number.isInteger(parsedApiPort) ? parsedApiPort : 3001
const clientPort = Number.isInteger(parsedClientPort) ? parsedClientPort : 5173

const loopbackHosts = ['127.0.0.1', '::1']

const colors = {
  api: '\x1b[36m',
  web: '\x1b[35m',
  app: '\x1b[32m',
  dev: '\x1b[38;5;179m',
  reset: '\x1b[0m',
}
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
const electronMode = process.argv.slice(2).includes('--electron')

function paint(text, color) {
  return useColor ? `${color}${text}${colors.reset}` : text
}

function log(message) {
  process.stdout.write(`${paint('[dev]', colors.dev)} ${message}\n`)
}

function hostForUrl(host) {
  return host === '::1' ? '[::1]' : host
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host })
    const finish = (free) => {
      socket.destroy()
      resolve(free)
    }
    socket.setTimeout(800)
    socket.once('connect', () => finish(false))
    socket.once('timeout', () => finish(true))
    socket.once('error', () => finish(true))
  })
}

/** `true` si nadie acepta conexiones en el puerto (IPv4 ni IPv6). */
async function isPortFree(port) {
  for (const host of loopbackHosts) {
    if (!(await canConnect(port, host))) return false
  }
  return true
}

async function fetchWithTimeout(url, timeoutMs = 1200) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Prueba el mismo endpoint en IPv4 e IPv6 (Vite escucha solo en `localhost`). */
async function requestOnBothHosts(pathname, port) {
  for (const host of loopbackHosts) {
    try {
      const response = await fetchWithTimeout(
        `http://${hostForUrl(host)}:${port}${pathname}`,
      )
      if (response.ok) return response
    } catch {
      // Se prueba el siguiente loopback.
    }
  }
  return null
}

function expectedDatabasePath() {
  const configured = process.env.DATABASE_PATH
  if (configured) return path.resolve(configured)
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(rootDir, 'data')
  return path.join(dataDir, 'finanzas.db')
}

/** Devuelve el health de esta app si el puerto sirve NUESTRA base de datos. */
async function detectOurApi(port) {
  const response = await requestOnBothHosts('/api/health', port)
  if (!response) return null
  try {
    const health = await response.json()
    if (health?.status !== 'ok' || typeof health.path !== 'string') return null
    const sameDatabase =
      path.resolve(health.path) === expectedDatabasePath()
    return sameDatabase ? health : null
  } catch {
    return null
  }
}

/** Detecta el Vite de este proyecto por el título del documento. */
async function detectOurClient(port) {
  const response = await requestOnBothHosts('/', port)
  if (!response) return false
  try {
    const html = await response.text()
    return html.includes('<title>Presupuesto Personal</title>')
  } catch {
    return false
  }
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) return port
  }
  throw new Error(`No encontré un puerto libre a partir de ${startPort}`)
}

async function waitForClient(port, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await detectOurClient(port)) return true
    await delay(250)
  }
  return false
}

function buildElectronMain() {
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, 'scripts', 'build-electron.mjs')],
    { cwd: rootDir, stdio: 'inherit', env: process.env },
  )
  if (result.status !== 0) {
    throw new Error('No se pudo compilar el proceso principal de Electron')
  }
}

function readState() {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8')
    const state = JSON.parse(raw)
    if (!state || typeof state !== 'object') return null
    return state
  } catch {
    return null
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  } catch (error) {
    log(`No pude guardar ${path.basename(stateFile)}: ${error.message}`)
  }
}

function clearState() {
  try {
    fs.unlinkSync(stateFile)
  } catch {
    // No existía.
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

/** En POSIX cada hijo es líder de su propio grupo de procesos. */
function isTreeAlive(pid) {
  if (!isWindows && Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(-pid, 0)
      return true
    } catch (error) {
      if (error.code === 'EPERM') return true
    }
  }
  return isPidAlive(pid)
}

function signalTree(pid, signal) {
  if (!Number.isInteger(pid) || pid <= 0) return
  if (isWindows) {
    if (signal === 'SIGKILL') {
      spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' })
    } else {
      try {
        process.kill(pid, signal)
      } catch {
        // Ya terminó.
      }
    }
    return
  }
  try {
    process.kill(-pid, signal)
  } catch {
    try {
      process.kill(pid, signal)
    } catch {
      // Ya terminó.
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitUntilIdle(pids, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (pids.every((pid) => !isTreeAlive(pid))) return true
    await delay(120)
  }
  return pids.every((pid) => !isTreeAlive(pid))
}

/**
 * Evita matar procesos ajenos si el archivo de estado quedó de un arranque
 * anterior y el sistema reutilizó los PID: solo se acepta el registro si es
 * reciente o si los puertos siguen sirviendo esta misma app.
 */
async function stateMatchesThisProject(state, alivePids) {
  if (alivePids.length === 0) return false
  const startedAt = Date.parse(state.startedAt ?? '')
  const age = Date.now() - startedAt
  if (Number.isFinite(startedAt) && age >= 0 && age < 5 * 60_000) return true
  if (Number.isInteger(state.apiPort) && (await detectOurApi(state.apiPort))) {
    return true
  }
  if (
    Number.isInteger(state.clientPort) &&
    (await detectOurClient(state.clientPort))
  ) {
    return true
  }
  return false
}

async function stopTrees(pids) {
  const alive = pids.filter((pid) => Number.isInteger(pid) && isTreeAlive(pid))
  if (alive.length === 0) return
  for (const pid of alive) signalTree(pid, 'SIGTERM')
  if (await waitUntilIdle(alive, 3500)) return
  for (const pid of alive) {
    if (isTreeAlive(pid)) signalTree(pid, 'SIGKILL')
  }
  await waitUntilIdle(alive, 1500)
}

function pipeOutput(stream, label, color) {
  if (!stream) return
  const prefix = paint(label.padEnd(3), color)
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) process.stdout.write(`${prefix} ${line}\n`)
    }
  })
  stream.on('end', () => {
    if (buffer.trim()) process.stdout.write(`${prefix} ${buffer}\n`)
  })
}

function spawnLocalBin(name, args, { env, label, color }) {
  const command = path.join(
    rootDir,
    'node_modules',
    '.bin',
    isWindows ? `${name}.cmd` : name,
  )
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWindows,
    windowsHide: true,
    shell: isWindows,
  })
  pipeOutput(child.stdout, label, color)
  pipeOutput(child.stderr, label, color)
  return child
}

let shuttingDown = false
let children = []

async function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  const pids = children.map((child) => child.pid).filter(Boolean)
  if (pids.length > 0) log('Deteniendo servidores locales…')
  try {
    await stopTrees(pids)
  } finally {
    clearState()
  }
  process.exit(code)
}

function watchChild(name, child) {
  child.on('error', (error) => {
    if (shuttingDown) return
    log(`No pude iniciar ${name}: ${error.message}`)
    void shutdown(1)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    const detail = signal ? `señal ${signal}` : `código ${code ?? 0}`
    log(`${name} terminó (${detail}). Cerrando el resto.`)
    void shutdown(code ?? 1)
  })
}

async function stopCommand() {
  const state = readState()
  if (!state) {
    log('No hay una instancia de desarrollo registrada por "pnpm dev".')
    if (!(await isPortFree(apiPort))) {
      log(
        `El puerto ${apiPort} está ocupado, pero no fue iniciado con "pnpm dev". ` +
          'Ciérralo desde su terminal.',
      )
    }
    return
  }

  const pids = [state.apiPid, state.clientPid, state.electronPid].filter((pid) =>
    Number.isInteger(pid),
  )
  const alive = pids.filter((pid) => isTreeAlive(pid))
  if (alive.length === 0) {
    clearState()
    log('No hay procesos activos de la instancia registrada.')
    return
  }
  if (!(await stateMatchesThisProject(state, alive))) {
    clearState()
    log('Ignoré un registro de desarrollo antiguo (los PID ya no coinciden).')
    return
  }

  log('Deteniendo la instancia de desarrollo…')
  await stopTrees(alive)
  clearState()
  log('Instancia detenida. Los puertos quedaron libres.')
}

async function startCommand() {
  const previous = readState()
  if (previous) {
    const previousPids = [
      previous.apiPid,
      previous.clientPid,
      previous.electronPid,
    ].filter((pid) => Number.isInteger(pid))
    const alive = previousPids.filter((pid) => isTreeAlive(pid))
    if (alive.length > 0 && (await stateMatchesThisProject(previous, alive))) {
      log(
        `Detecté una instancia anterior (PID ${alive.join(', ')}). ` +
          'La detengo para liberar los puertos…',
      )
      await stopTrees(alive)
    }
    clearState()
  }

  let targetApiPort = apiPort
  let targetClientPort = clientPort
  let apiChild = null
  let webChild = null
  let electronChild = null
  const runningApi = await detectOurApi(apiPort)
  const runningClient = await detectOurClient(clientPort)

  if (runningApi && runningClient && !electronMode) {
    log(`La aplicación ya está en marcha en http://localhost:${clientPort}`)
    log('Cierra esa terminal o usa "pnpm dev:stop" para reiniciarla.')
    return
  }

  if (runningApi) {
    log(
      `Ya hay una API de este proyecto en http://localhost:${apiPort}; la reutilizo.`,
    )
  } else if (!(await isPortFree(apiPort))) {
    targetApiPort = await findFreePort(apiPort + 1)
    log(
      `El puerto ${apiPort} está ocupado por otro programa. La API usará http://localhost:${targetApiPort}.`,
    )
  }

  const reuseClient = electronMode && runningApi && runningClient
  if (electronMode && !reuseClient && !(await isPortFree(clientPort))) {
    targetClientPort = await findFreePort(clientPort + 1)
    log(
      `El puerto ${clientPort} está ocupado. Vite usará http://localhost:${targetClientPort}.`,
    )
  }

  if (!runningApi) {
    const apiEnv = { ...process.env, PORT: String(targetApiPort) }
    apiChild = spawnLocalBin('tsx', ['watch', 'src/server/index.ts'], {
      env: apiEnv,
      label: 'api',
      color: colors.api,
    })
    watchChild('La API', apiChild)
    children.push(apiChild)
  }

  if (!reuseClient) {
    const webEnv = {
      ...process.env,
      FINANZAS_API_PORT: String(targetApiPort),
      FINANZAS_CLIENT_PORT: String(targetClientPort),
      FINANZAS_STRICT_PORT: electronMode ? '1' : '0',
    }
    webChild = spawnLocalBin('vite', [], {
      env: webEnv,
      label: 'web',
      color: colors.web,
    })
    watchChild('Vite', webChild)
    children.push(webChild)
  }

  if (electronMode) {
    if (!reuseClient) {
      log(`Esperando a que Vite responda en http://localhost:${targetClientPort}…`)
      if (!(await waitForClient(targetClientPort))) {
        throw new Error('Vite no respondió a tiempo; no se abrirá Electron')
      }
    }
    buildElectronMain()
    const electronEnv = {
      ...process.env,
      ELECTRON_RENDERER_URL: `http://localhost:${targetClientPort}`,
    }
    electronChild = spawnLocalBin('electron', ['.'], {
      env: electronEnv,
      label: 'app',
      color: colors.app,
    })
    watchChild('Electron', electronChild)
    children.push(electronChild)
  }

  writeState({
    apiPid: apiChild?.pid ?? null,
    clientPid: webChild?.pid ?? null,
    electronPid: electronChild?.pid ?? null,
    apiPort: targetApiPort,
    clientPort: targetClientPort,
    startedAt: new Date().toISOString(),
  })

  log(
    `API: http://localhost:${targetApiPort} · Interfaz: http://localhost:${targetClientPort}`,
  )
  if (electronMode) {
    log('Electron abierto. Al cerrar la ventana se detiene todo el entorno.')
  } else {
    log('Para detener: Ctrl+C o "pnpm dev:stop".')
  }
}

process.on('SIGINT', () => void shutdown(0))
process.on('SIGTERM', () => void shutdown(0))
if (!isWindows) process.on('SIGHUP', () => void shutdown(0))

const isStopCommand = process.argv.slice(2).includes('--stop')
const entry = isStopCommand ? stopCommand : startCommand
entry().catch(async (error) => {
  console.error(`[dev] ${error.message}`)
  await shutdown(1)
})
