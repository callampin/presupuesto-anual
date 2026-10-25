/**
 * Versión de la aplicación inyectada por Vite desde `package.json`.
 * En pruebas de Node sin Vite se usa un valor de respaldo.
 */

declare const __APP_VERSION__: string

export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

/** Etiqueta corta para la cabecera: 1.1.0 → v1.1 */
export const APP_VERSION_LABEL = `v${APP_VERSION.split('.').slice(0, 2).join('.')}`

export const GITHUB_PROFILE_URL = 'https://github.com/callampin'
export const GITHUB_REPO_URL = 'https://github.com/callampin/presupuesto-anual'
export const LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`
