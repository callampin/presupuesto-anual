import { useCallback, useEffect, useState } from 'react'

export type AppView = 'annual' | 'month' | 'compound' | 'settings'

export interface AppRoute {
  view: AppView
  month: number | null
}

const DEFAULT_ROUTE: AppRoute = { view: 'annual', month: null }

/** Lee el hash (`#/anual`, `#/mes/10`, `#/interes`, `#/ajustes`). */
export function parseHash(hash: string): AppRoute {
  const clean = hash.replace(/^#\/?/, '')

  if (clean.startsWith('mes/')) {
    const month = Number(clean.slice(4))
    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      return { view: 'month', month }
    }
  }
  if (clean === 'interes') return { view: 'compound', month: null }
  if (clean === 'ajustes') return { view: 'settings', month: null }
  return DEFAULT_ROUTE
}

export function routeToHash(route: AppRoute): string {
  if (route.view === 'month' && route.month) return `#/mes/${route.month}`
  if (route.view === 'compound') return '#/interes'
  if (route.view === 'settings') return '#/ajustes'
  return '#/anual'
}

/**
 * Navegación por hash, sin dependencias de router.
 *
 * Actualiza el estado inmediatamente (no depende de que el navegador emita
 * `hashchange`) y sincroniza la URL con `pushState`. También escucha
 * `hashchange` y `popstate` para atrás/adelante y enlaces manuales.
 */
export function useViewRoute() {
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash))

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  const navigate = useCallback((next: AppRoute) => {
    const hash = routeToHash(next)
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash)
    }
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return { route, navigate }
}
