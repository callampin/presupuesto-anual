import { DEFAULT_CURRENCY, type CurrencyConfig } from '@/lib/format'
import { useSettings } from '@/lib/queries'

/** Configuración de moneda global, con valores por defecto mientras carga. */
export function useCurrencyConfig(): CurrencyConfig {
  const { data } = useSettings()

  if (!data) return DEFAULT_CURRENCY

  return {
    currencySymbol: data.currencySymbol,
    currencyCode: data.currencyCode,
    locale: data.locale,
    decimalPlaces: data.decimalPlaces,
  }
}
