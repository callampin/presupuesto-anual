/**
 * Hooks de TanStack Query por recurso de la API local.
 *
 * Centralizan claves de caché e invalidaciones para que cualquier mutación
 * refresque el mes y el consolidado anual afectados.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type {
  AnnualGoalRow,
  CatalogItemRow,
  CompoundSimulationRow,
  ExpenseTransactionRow,
  MonthlyBillRow,
  MonthlyDebtRow,
  MonthlyExpenseCategoryRow,
  MonthlyIncomeRow,
  MonthlySavingRow,
  SettingsRow,
  YearRow,
} from '@shared/schema'
import type { AnnualSummary, MonthlySummary, SectionKey } from '@shared/types'
import { api } from './api'

export const queryKeys = {
  health: ['health'] as const,
  settings: ['settings'] as const,
  catalog: (section?: SectionKey) => ['catalog', section ?? 'all'] as const,
  years: ['years'] as const,
  yearSummary: (year: number) => ['year-summary', year] as const,
  month: (year: number, month: number) => ['month', year, month] as const,
  simulations: ['simulations'] as const,
}

export interface HealthResponse {
  status: string
  stage: number
  database: string
  path: string
  currency: string | null
  defaultYear: number | null
  catalogItems: number
  years: number
  monthlyPeriods: number
  timestamp: string
}

export interface YearSummaryResponse {
  year: YearRow
  goals: AnnualGoalRow[]
  initializedMonths: number[]
  summary: AnnualSummary
}

/** Bloques con CRUD de filas dentro de un mes. */
export type MonthBlock = 'incomes' | 'bills' | 'expense-categories' | 'savings' | 'debts'

export interface MonthResponse {
  year: number
  month: number
  monthName: string
  period: { id: number; isInitialized: boolean }
  incomes: MonthlyIncomeRow[]
  bills: MonthlyBillRow[]
  expenseCategories: Array<MonthlyExpenseCategoryRow & { actualAmount: number }>
  savings: MonthlySavingRow[]
  debts: MonthDebtRow[]
  debtAccounts: DebtAccount[]
  transactions: Array<ExpenseTransactionRow & { categoryId: number }>
  summary: MonthlySummary
}

/** Fila mensual de deuda con su seguimiento de saldo. */
export interface MonthDebtRow extends MonthlyDebtRow {
  totalAmount: number | null
  /** Suma de abonos de todos los meses para esta deuda. */
  paidAmount: number
  /** Saldo pendiente; `null` si no hay total definido. */
  remainingAmount: number | null
  isSettled: boolean
}

/** Estado consolidado de una deuda del catálogo. */
export interface DebtAccount {
  catalogItemId: number
  name: string
  defaultAmount: number
  totalAmount: number | null
  paidAmount: number
  remainingAmount: number | null
  isSettled: boolean
  isActive: boolean
}

export type SimulationRow = Omit<CompoundSimulationRow, 'withdrawalsJson'> & {
  withdrawals: Record<string, number>
}

export type SettingsPatch = Partial<Omit<SettingsRow, 'id'>>

export interface CatalogItemInput {
  section: SectionKey
  name: string
  defaultAmount?: number
  totalAmount?: number | null
  defaultDayOfMonth?: number | null
  isActive?: boolean
}

export interface TransactionInput {
  expenseCategoryId: number
  amount: number
  date?: string | null
  notes?: string
}

export interface SimulationInput {
  name: string
  initialCapital: number
  monthlyRate: number
  months: number
  monthlyContribution?: number
  withdrawals?: Record<string, number>
}

export type InitializeSource = 'catalog' | 'previous' | 'blank'

function invalidateMonth(client: QueryClient, year: number, month: number): void {
  void client.invalidateQueries({ queryKey: queryKeys.month(year, month) })
  void client.invalidateQueries({ queryKey: queryKeys.yearSummary(year) })
}

// ---------------------------------------------------------------------------
// Estado del servidor y configuración
// ---------------------------------------------------------------------------

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.get<HealthResponse>('/api/health'),
    refetchInterval: 60_000,
    retry: 1,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.get<SettingsRow>('/api/settings'),
  })
}

export function useUpdateSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.put<SettingsRow>('/api/settings', patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}

// ---------------------------------------------------------------------------
// Catálogo maestro
// ---------------------------------------------------------------------------

export function useCatalog(section?: SectionKey) {
  return useQuery({
    queryKey: queryKeys.catalog(section),
    queryFn: () =>
      api.get<CatalogItemRow[]>(
        section ? `/api/catalog?section=${encodeURIComponent(section)}` : '/api/catalog',
      ),
  })
}

export function useCreateCatalogItem() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CatalogItemInput) => api.post<CatalogItemRow>('/api/catalog', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['catalog'] })
      // Las deudas nuevas deben aparecer en el mes para poder registrar su pago.
      void client.invalidateQueries({ queryKey: ['month'] })
      void client.invalidateQueries({ queryKey: ['year-summary'] })
    },
  })
}

export function useUpdateCatalogItem() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CatalogItemInput> & { sortOrder?: number } }) =>
      api.put<CatalogItemRow>(`/api/catalog/${id}`, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['catalog'] })
      void client.invalidateQueries({ queryKey: ['month'] })
      void client.invalidateQueries({ queryKey: ['year-summary'] })
    },
  })
}

export function useDeleteCatalogItem() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/catalog/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['catalog'] })
      void client.invalidateQueries({ queryKey: ['month'] })
      void client.invalidateQueries({ queryKey: ['year-summary'] })
    },
  })
}

export function useReorderCatalog() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ section, ids }: { section: SectionKey; ids: number[] }) =>
      api.put<CatalogItemRow[]>('/api/catalog/reorder', { section, ids }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['catalog'] })
      void client.invalidateQueries({ queryKey: ['month'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Años y consolidado
// ---------------------------------------------------------------------------

export function useYears() {
  return useQuery({
    queryKey: queryKeys.years,
    queryFn: () => api.get<YearRow[]>('/api/years'),
  })
}

export function useCreateYear() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (year: number) => api.post<YearRow>('/api/years', { year }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.years })
    },
  })
}

export function useDeleteYear() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (year: number) => api.delete(`/api/years/${year}`),
    onSuccess: () => {
      // Cambia el año por defecto, los periodos y todas las vistas dependientes.
      void client.invalidateQueries()
    },
  })
}

export function useYearSummary(year: number) {
  return useQuery({
    queryKey: queryKeys.yearSummary(year),
    queryFn: () => api.get<YearSummaryResponse>(`/api/years/${year}/summary`),
  })
}

export interface YearUpdateInput {
  goalsTitle?: string
  notesTitle?: string
  notesContent?: string
}

export function useUpdateYear(year: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: YearUpdateInput) => api.put<YearRow>(`/api/years/${year}`, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.yearSummary(year) })
    },
  })
}

export interface GoalInput {
  description: string
  targetAmount?: number | null
  isCompleted?: boolean
}

export function useCreateGoal(year: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: GoalInput) => api.post<AnnualGoalRow>(`/api/years/${year}/goals`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.yearSummary(year) })
    },
  })
}

export function useUpdateGoal(year: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<GoalInput> }) =>
      api.put<AnnualGoalRow>(`/api/years/${year}/goals/${id}`, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.yearSummary(year) })
    },
  })
}

export function useDeleteGoal(year: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/years/${year}/goals/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.yearSummary(year) })
    },
  })
}

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

export function useMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.month(year, month),
    queryFn: () => api.get<MonthResponse>(`/api/months/${year}/${month}`),
  })
}

export function useInitializeMonth(year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (source: InitializeSource) =>
      api.post<MonthResponse>(`/api/months/${year}/${month}/initialize`, { source }),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useCreateMonthRow(block: MonthBlock, year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: object) => api.post(`/api/months/${year}/${month}/${block}`, input),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useUpdateMonthRow(block: MonthBlock, year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: object }) =>
      api.put(`/api/months/${year}/${month}/${block}/${id}`, patch),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useDeleteMonthRow(block: MonthBlock, year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/months/${year}/${month}/${block}/${id}`),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useCreateTransaction(year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      api.post(`/api/months/${year}/${month}/transactions`, input),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useUpdateTransaction(year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<TransactionInput> }) =>
      api.put(`/api/months/${year}/${month}/transactions/${id}`, patch),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

export function useDeleteTransaction(year: number, month: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/months/${year}/${month}/transactions/${id}`),
    onSuccess: () => invalidateMonth(client, year, month),
  })
}

// ---------------------------------------------------------------------------
// Calculadora de interés compuesto
// ---------------------------------------------------------------------------

export function useSimulations() {
  return useQuery({
    queryKey: queryKeys.simulations,
    queryFn: () => api.get<SimulationRow[]>('/api/simulations'),
  })
}

export function useCreateSimulation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SimulationInput) => api.post<SimulationRow>('/api/simulations', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.simulations })
    },
  })
}

export function useUpdateSimulation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<SimulationInput> }) =>
      api.put<SimulationRow>(`/api/simulations/${id}`, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.simulations })
    },
  })
}

export function useDeleteSimulation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/simulations/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.simulations })
    },
  })
}

// ---------------------------------------------------------------------------
// Reset total
// ---------------------------------------------------------------------------

export function useResetAllData() {
  return useMutation({
    mutationFn: () =>
      api.post<{ reset: boolean }>('/api/backup/reset', { confirmation: 'ELIMINAR' }),
  })
}
