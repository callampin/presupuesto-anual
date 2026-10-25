import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { SettingsRow } from '@shared/schema'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { useUpdateSettings, useYears } from '@/lib/queries'

const DECIMAL_OPTIONS = [0, 1, 2, 3, 4]

/** Formulario de moneda, formato regional y año por defecto. */
export function CurrencySettings({ settings }: { settings: SettingsRow }) {
  const updateSettings = useUpdateSettings()
  const { data: years } = useYears()

  const [symbol, setSymbol] = useState(settings.currencySymbol)
  const [code, setCode] = useState(settings.currencyCode)
  const [locale, setLocale] = useState(settings.locale)
  const [decimals, setDecimals] = useState(String(settings.decimalPlaces))
  const [defaultYear, setDefaultYear] = useState(
    settings.defaultYear === null ? '' : String(settings.defaultYear),
  )
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setSymbol(settings.currencySymbol)
    setCode(settings.currencyCode)
    setLocale(settings.locale)
    setDecimals(String(settings.decimalPlaces))
    setDefaultYear(settings.defaultYear === null ? '' : String(settings.defaultYear))
  }, [settings])

  useEffect(() => {
    setNotice(null)
  }, [symbol, code, locale, decimals, defaultYear])

  const decimalsNumber = Number(decimals)
  const valid =
    symbol.trim() !== '' &&
    code.trim() !== '' &&
    locale.trim().length >= 2 &&
    Number.isInteger(decimalsNumber) &&
    decimalsNumber >= 0 &&
    decimalsNumber <= 4

  let preview = '—'
  if (valid) {
    try {
      preview = formatCurrency(1234.5, {
        currencySymbol: symbol.trim(),
        currencyCode: code.trim().toUpperCase(),
        locale: locale.trim(),
        decimalPlaces: decimalsNumber,
      })
    } catch {
      preview = 'Locale inválido'
    }
  }

  function handleSave() {
    if (!valid) {
      setError('Revisa el símbolo, código, locale y decimales.')
      return
    }
    setError(null)
    updateSettings.mutate(
      {
        currencySymbol: symbol.trim(),
        currencyCode: code.trim().toUpperCase(),
        locale: locale.trim(),
        decimalPlaces: decimalsNumber,
        defaultYear: defaultYear === '' ? null : Number(defaultYear),
      },
      {
        onSuccess: () => setNotice('Configuración guardada'),
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : 'No se pudo guardar la configuración',
          ),
      },
    )
  }

  return (
    <Card className="plot-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Moneda y formato</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Se aplica a todos los montos de la aplicación.
          </p>
        </div>
        <div className="rounded-[2px] border border-border bg-muted/30 px-3 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          Vista previa: <span className="font-medium text-foreground">{preview}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Símbolo
          </span>
          <Input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            maxLength={5}
            className="text-right"
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Código ISO
          </span>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={10}
            className="uppercase"
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Locale
          </span>
          <Input
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            placeholder="es-MX"
            maxLength={20}
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Decimales
          </span>
          <Select value={decimals} onChange={(event) => setDecimals(event.target.value)}>
            {DECIMAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Año por defecto
          </span>
          <Select
            value={defaultYear}
            onChange={(event) => setDefaultYear(event.target.value)}
          >
            <option value="">Sin año por defecto</option>
            {years?.map((year) => (
              <option key={year.year} value={year.year}>
                {year.year}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="space-y-1 text-[11px]">
          {error ? <p className="text-destructive">{error}</p> : null}
          {notice ? <p className="text-income">{notice}</p> : null}
          {!valid ? <p className="text-expenses">Completa los campos obligatorios.</p> : null}
        </div>
        <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Guardar configuración
        </Button>
      </div>
    </Card>
  )
}
