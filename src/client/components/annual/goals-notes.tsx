import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus, StickyNote, Target, Trash2 } from 'lucide-react'
import type { AnnualGoalRow, YearRow } from '@shared/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { AmountInput } from '@/components/financial/amount-input'
import { parseAmountInput, type CurrencyConfig } from '@/lib/format'
import { useCreateGoal, useDeleteGoal, useUpdateGoal, useUpdateYear } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface GoalsNotesProps {
  year: number
  yearRow: YearRow
  goals: AnnualGoalRow[]
  config: CurrencyConfig
}

/** Bloques editables de metas financieras y notas anuales. */
export function GoalsNotes({ year, yearRow, goals, config }: GoalsNotesProps) {
  const updateYear = useUpdateYear(year)
  const createGoal = useCreateGoal(year)
  const updateGoal = useUpdateGoal(year)
  const deleteGoal = useDeleteGoal(year)

  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [goalError, setGoalError] = useState<string | null>(null)

  const [notes, setNotes] = useState(yearRow.notesContent)
  useEffect(() => {
    setNotes(yearRow.notesContent)
  }, [yearRow.year, yearRow.notesContent])

  const notesDirty = notes !== yearRow.notesContent
  const completed = goals.filter((goal) => goal.isCompleted).length

  function handleAddGoal(event: FormEvent) {
    event.preventDefault()
    const trimmed = description.trim()
    if (trimmed === '') return

    let amount: number | null = null
    if (targetAmount.trim() !== '') {
      const parsed = parseAmountInput(targetAmount)
      if (parsed === null) {
        setGoalError('El monto meta no es válido')
        return
      }
      amount = parsed
    }

    setGoalError(null)
    createGoal.mutate(
      { description: trimmed, targetAmount: amount },
      {
        onSuccess: () => {
          setDescription('')
          setTargetAmount('')
        },
        onError: (error) =>
          setGoalError(error instanceof Error ? error.message : 'No se pudo crear la meta'),
      },
    )
  }

  const goalMutationError = createGoal.error ?? updateGoal.error ?? deleteGoal.error
  const yearError = updateYear.error

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="plot-panel p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0 text-savings" aria-hidden="true" />
            <EditableTextCell
              value={yearRow.goalsTitle}
              ariaLabel="Título de metas financieras"
              onCommit={(goalsTitle) => updateYear.mutate({ goalsTitle })}
              className="px-0 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            />
          </div>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {completed}/{goals.length}
          </Badge>
        </div>

        <div className="p-4">
          <form onSubmit={handleAddGoal} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Nueva meta financiera…"
              aria-label="Descripción de la nueva meta"
              className="flex-1"
            />
            <AmountInput
              value={targetAmount}
              onValueChange={setTargetAmount}
              maxDecimals={Math.max(config.decimalPlaces, 2)}
              placeholder="Monto (opcional)"
              aria-label="Monto objetivo de la nueva meta"
              className="text-right tabular-nums sm:w-36"
            />
            <Button
              type="submit"
              size="sm"
              disabled={description.trim() === '' || createGoal.isPending}
            >
              {createGoal.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Agregar
            </Button>
          </form>

          {goalError ? <p className="mt-2 text-[11px] text-destructive">{goalError}</p> : null}
          {goalMutationError ? (
            <p className="mt-2 text-[11px] text-destructive">
              {goalMutationError instanceof Error
                ? goalMutationError.message
                : 'No se pudo actualizar la meta'}
            </p>
          ) : null}

          {goals.length === 0 ? (
            <div className="mt-4 flex h-20 items-center justify-center border border-dashed border-border/70 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Sin metas para este año
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
              {goals.map((goal) => (
                <li key={goal.id} className="flex items-start gap-2 py-2">
                  <Checkbox
                    checked={goal.isCompleted}
                    aria-label={`Meta ${goal.description} cumplida`}
                    className="mt-1.5"
                    onChange={(event) =>
                      updateGoal.mutate({
                        id: goal.id,
                        patch: { isCompleted: event.target.checked },
                      })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <EditableTextCell
                      value={goal.description}
                      ariaLabel={`Descripción de la meta ${goal.description}`}
                      onCommit={(nextDescription) =>
                        updateGoal.mutate({
                          id: goal.id,
                          patch: { description: nextDescription },
                        })
                      }
                      className={cn(
                        'text-sm',
                        goal.isCompleted && 'text-muted-foreground line-through',
                      )}
                    />
                    {goal.targetAmount !== null ? (
                      <div className="flex items-center gap-1 px-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                        <span>Meta</span>
                        <div className="w-28">
                          <EditableCurrencyCell
                            value={goal.targetAmount}
                            config={config}
                            ariaLabel={`Monto meta de ${goal.description}`}
                            className="px-1 py-0 text-[10px]"
                            onCommit={(nextAmount) =>
                              updateGoal.mutate({
                                id: goal.id,
                                patch: { targetAmount: nextAmount },
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar meta ${goal.description}`}
                    title="Eliminar meta"
                    className="h-7 w-7 text-muted-foreground/70 hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la meta "${goal.description}"?`)) {
                        deleteGoal.mutate(goal.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="plot-panel flex flex-col p-0">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-bills" aria-hidden="true" />
          <EditableTextCell
            value={yearRow.notesTitle}
            ariaLabel="Título de notas anuales"
            onCommit={(notesTitle) => updateYear.mutate({ notesTitle })}
            className="px-0 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notas, recordatorios o decretos del año…"
            aria-label="Notas anuales"
            className="min-h-[232px] w-full flex-1 resize-y rounded-[2px] border border-input bg-background/50 p-3 text-sm leading-relaxed placeholder:text-muted-foreground/55 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={cn(
                'font-mono text-[9px] uppercase tracking-[0.08em]',
                notesDirty ? 'text-expenses' : 'text-muted-foreground',
              )}
            >
              {notesDirty ? 'Cambios sin guardar' : 'Guardado'}
            </span>
            <Button
              size="sm"
              variant={notesDirty ? 'default' : 'outline'}
              disabled={!notesDirty || updateYear.isPending}
              onClick={() => updateYear.mutate({ notesContent: notes })}
            >
              {updateYear.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Guardar notas
            </Button>
          </div>

          {yearError ? (
            <p className="mt-2 text-[11px] text-destructive">
              {yearError instanceof Error
                ? yearError.message
                : 'No se pudieron guardar los cambios'}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
