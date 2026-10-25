import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'finanzas.activeYear'

/**
 * Año activo persistido en `localStorage`. Si no hay valor guardado usa el
 * `defaultYear` de la configuración y, en última instancia, el año actual.
 */
export function useActiveYear(defaultYear: number | null | undefined) {
  const [storedYear, setStoredYear] = useState<number | null>(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY))
    return Number.isInteger(stored) && stored >= 1900 && stored <= 3000 ? stored : null
  })

  useEffect(() => {
    if (storedYear === null && defaultYear != null) {
      setStoredYear(defaultYear)
    }
  }, [storedYear, defaultYear])

  const setYear = useCallback((year: number) => {
    setStoredYear(year)
    window.localStorage.setItem(STORAGE_KEY, String(year))
  }, [])

  const year = storedYear ?? defaultYear ?? new Date().getFullYear()

  return { year, setYear }
}
