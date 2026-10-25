import { useEffect, useState } from 'react'

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

/**
 * Mes actual del calendario. Se actualiza al pasar la medianoche y cuando la
 * ventana vuelve a estar visible o recibe el foco (por si el equipo suspendió
 * el proceso).
 */
export function useCurrentMonth(): number {
  const [month, setMonth] = useState(getCurrentMonth)

  useEffect(() => {
    let timer = 0

    const update = () => {
      setMonth(getCurrentMonth())
    }

    const scheduleNextMidnight = () => {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      )
      timer = window.setTimeout(
        () => {
          update()
          scheduleNextMidnight()
        },
        Math.max(1000, nextMidnight.getTime() - now.getTime()),
      )
    }

    scheduleNextMidnight()

    const handleFocus = () => update()
    const handleVisibility = () => {
      if (!document.hidden) update()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return month
}
