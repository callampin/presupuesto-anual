import { useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Database, Download, FileJson, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { backupFileName, saveBackup } from '@/lib/desktop'

interface BackupFile {
  app?: string
  version?: number
  exportedAt?: string
  data?: Record<string, unknown>
}

interface SelectedBackup {
  fileName: string
  payload: unknown
  exportedAt?: string
  counts: Array<{ key: string; count: number }>
}

interface ImportResponse {
  imported: boolean
  exportedAt: string
  counts: Record<string, number>
}

const COUNT_LABELS: Record<string, string> = {
  settings: 'Configuración',
  years: 'Años',
  catalogItems: 'Catálogo',
  annualGoals: 'Metas',
  monthlyPeriods: 'Periodos',
  monthlyIncomes: 'Ingresos',
  monthlyBills: 'Facturas',
  monthlyExpenseCategories: 'Categorías',
  expenseTransactions: 'Transacciones',
  monthlySavings: 'Ahorros',
  monthlyDebts: 'Deudas',
  compoundSimulations: 'Simulaciones',
}

/** Exportación, restauración e importación de respaldos locales. */
export function BackupPanel() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [backup, setBackup] = useState<SelectedBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState<'json' | 'db' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function handleDownload(kind: 'json' | 'db') {
    setError(null)
    setResult(null)
    setDownloading(kind)
    try {
      const path =
        kind === 'json' ? '/api/backup/export-json' : '/api/backup/download-db'
      const outcome = await saveBackup(path, backupFileName(kind))
      if (outcome.saved) {
        setResult(
          outcome.path
            ? `Respaldo guardado en ${outcome.path}`
            : 'Respaldo descargado.',
        )
      }
    } catch (catchError) {
      setError(
        catchError instanceof Error
          ? catchError.message
          : 'No se pudo guardar el respaldo',
      )
    } finally {
      setDownloading(null)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setResult(null)
    setBackup(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as BackupFile

      if (parsed.app !== 'presupuesto-personal' || parsed.version !== 1 || !parsed.data) {
        throw new Error('El archivo no es un respaldo válido de esta aplicación')
      }

      const counts = Object.entries(parsed.data).map(([key, value]) => ({
        key,
        count: Array.isArray(value) ? value.length : 0,
      }))

      setBackup({
        fileName: file.name,
        payload: parsed,
        exportedAt: parsed.exportedAt,
        counts,
      })
    } catch (catchError) {
      setError(
        catchError instanceof Error ? catchError.message : 'No se pudo leer el archivo JSON',
      )
    }
  }

  async function handleRestore() {
    if (!backup) return
    if (
      !window.confirm(
        'Esto reemplazará TODOS tus datos actuales por el respaldo seleccionado. Esta acción no se puede deshacer. ¿Continuar?',
      )
    ) {
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.post<ImportResponse>('/api/backup/import-json', backup.payload)
      await queryClient.invalidateQueries()
      setResult(
        `Respaldo restaurado: ${response.counts.catalogItems ?? 0} ítems de catálogo, ` +
          `${response.counts.years ?? 0} año(s) y ${response.counts.expenseTransactions ?? 0} transacciones.`,
      )
      setBackup(null)
    } catch (catchError) {
      setError(
        catchError instanceof Error ? catchError.message : 'No se pudo restaurar el respaldo',
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="plot-panel p-0">
      <div className="border-b border-border/70 px-5 py-4">
        <h3 className="text-sm font-medium">Respaldos locales</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Copias de seguridad en tu equipo. No se envía nada a internet.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border/70 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="flex flex-col justify-between gap-4 p-5">
          <div>
            <FileJson className="h-4 w-4 text-bills" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium">Exportar JSON</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Descarga todos los datos (catálogo, meses, transacciones, metas y simulaciones) en un
              archivo legible.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload('json')}
            disabled={downloading !== null}
          >
            {downloading === 'json' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Descargar respaldo
          </Button>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5">
          <div>
            <Upload className="h-4 w-4 text-expenses" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium">Restaurar desde JSON</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Reemplaza la base actual por un respaldo previamente exportado.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {backup ? (
              <div className="mt-3 border border-expenses/30 bg-expenses/5 p-2.5">
                <p className="truncate text-[11px] font-medium">{backup.fileName}</p>
                {backup.exportedAt ? (
                  <p className="font-mono text-[9px] text-muted-foreground">
                    Exportado: {new Date(backup.exportedAt).toLocaleString()}
                  </p>
                ) : null}
                <ul className="mt-2 grid grid-cols-2 gap-x-2 font-mono text-[9px] text-muted-foreground">
                  {backup.counts
                    .filter((entry) => entry.count > 0)
                    .map((entry) => (
                      <li key={entry.key} className="flex justify-between gap-1">
                        <span>{COUNT_LABELS[entry.key] ?? entry.key}</span>
                        <span className="tabular-nums">{entry.count}</span>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 flex items-start gap-1 font-mono text-[9px] uppercase tracking-[0.06em] text-expenses">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  Reemplaza todos los datos actuales.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Elegir archivo
            </Button>
            {backup ? (
              <Button size="sm" onClick={handleRestore} disabled={importing}>
                {importing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Restaurar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5">
          <div>
            <Database className="h-4 w-4 text-savings" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium">Copia SQLite</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Descarga una copia consistente de <span className="font-mono">finanzas.db</span> tal
              como está en disco.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload('db')}
            disabled={downloading !== null}
          >
            {downloading === 'db' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Descargar base de datos
          </Button>
        </div>
      </div>

      {error ? <p className="px-5 py-2.5 text-[11px] text-destructive">{error}</p> : null}
      {result ? <p className="px-5 py-2.5 text-[11px] text-income">{result}</p> : null}
    </Card>
  )
}
