import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UI_SCALE,
  UI_SCALE_OPTIONS,
  normalizeUiScale,
} from './ui-scale'

describe('escala de interfaz', () => {
  it('ofrece de 80% a 150% en pasos de 10', () => {
    expect(UI_SCALE_OPTIONS).toEqual([80, 90, 100, 110, 120, 130, 140, 150])
  })

  it('usa 100% por defecto', () => {
    expect(DEFAULT_UI_SCALE).toBe(100)
    expect(normalizeUiScale(Number.NaN)).toBe(100)
    expect(normalizeUiScale(Number.POSITIVE_INFINITY)).toBe(100)
  })

  it('limita los extremos', () => {
    expect(normalizeUiScale(10)).toBe(80)
    expect(normalizeUiScale(999)).toBe(150)
  })

  it('redondea al paso de 10 más cercano', () => {
    expect(normalizeUiScale(104)).toBe(100)
    expect(normalizeUiScale(106)).toBe(110)
    expect(normalizeUiScale(145)).toBe(150)
  })
})
