import { useCallback, useLayoutEffect, useState } from 'react'
import {
  DEFAULT_UI_SCALE,
  UI_SCALE_STORAGE_KEY,
  applyUiScale,
  normalizeUiScale,
} from '@/lib/ui-scale'

function readStoredScale(): number {
  try {
    const raw = window.localStorage.getItem(UI_SCALE_STORAGE_KEY)
    return raw === null ? DEFAULT_UI_SCALE : normalizeUiScale(Number(raw))
  } catch {
    return DEFAULT_UI_SCALE
  }
}

/** Estado de la escala de interfaz, persistido entre sesiones. */
export function useUiScale() {
  const [percent, setPercentState] = useState(readStoredScale)

  useLayoutEffect(() => {
    applyUiScale(percent)
    try {
      window.localStorage.setItem(UI_SCALE_STORAGE_KEY, String(percent))
    } catch {
      // localStorage puede estar deshabilitado; la escala sigue aplicándose.
    }
  }, [percent])

  const setPercent = useCallback((next: number) => {
    setPercentState(normalizeUiScale(next))
  }, [])

  return { percent, setPercent }
}
