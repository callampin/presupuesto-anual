/**
 * Escala de interfaz: 80%–150% en pasos de 10, con 100% por defecto.
 * Se aplica con `zoom` sobre `<html>` y se persiste en `localStorage`.
 */

export const UI_SCALE_STORAGE_KEY = 'finanzas.uiScale'
export const UI_SCALE_MIN = 80
export const UI_SCALE_MAX = 150
export const UI_SCALE_STEP = 10
export const DEFAULT_UI_SCALE = 100

export const UI_SCALE_OPTIONS: readonly number[] = Array.from(
  { length: (UI_SCALE_MAX - UI_SCALE_MIN) / UI_SCALE_STEP + 1 },
  (_, index) => UI_SCALE_MIN + index * UI_SCALE_STEP,
)

/** Lleva cualquier valor al rango permitido y al múltiplo de 10 más cercano. */
export function normalizeUiScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_UI_SCALE
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, value))
  return Math.round(clamped / UI_SCALE_STEP) * UI_SCALE_STEP
}

/** Aplica la escala al documento. 100% elimina el zoom para no dejar residuos. */
export function applyUiScale(percent: number): void {
  const root = document.documentElement
  const normalized = normalizeUiScale(percent)
  if (normalized === DEFAULT_UI_SCALE) {
    root.style.removeProperty('zoom')
  } else {
    root.style.zoom = String(normalized / 100)
  }
  root.dataset.uiScale = String(normalized)
}
