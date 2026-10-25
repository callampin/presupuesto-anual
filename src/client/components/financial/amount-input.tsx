import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { formatAmountInput } from '@/lib/format'

export interface AmountInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor ya formateado (se controla desde el padre). */
  value: string
  onValueChange: (value: string) => void
  /** Decimales permitidos al escribir (por defecto 2). */
  maxDecimals?: number
  allowNegative?: boolean
}

/**
 * Input de montos con agrupación de miles en vivo (`1,234,567.89`),
 * preservando la posición del cursor al editar en el medio.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onValueChange, maxDecimals = 2, allowNegative = true, ...props }, ref) => (
    <Input
      ref={ref}
      inputMode="decimal"
      {...props}
      value={value}
      onChange={(event) => {
        const input = event.currentTarget
        const caretFromEnd = input.value.length - (input.selectionStart ?? input.value.length)
        const formatted = formatAmountInput(input.value, { maxDecimals, allowNegative })
        if (input.value !== formatted) input.value = formatted
        onValueChange(formatted)

        requestAnimationFrame(() => {
          const position = Math.max(0, formatted.length - caretFromEnd)
          try {
            input.setSelectionRange(position, position)
          } catch {
            // El input puede haberse desmontado; no es un error relevante.
          }
        })
      }}
    />
  ),
)
AmountInput.displayName = 'AmountInput'
