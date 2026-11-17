import { describe, expect, it } from 'vitest'
import { DEFAULT_SORT, LISTED_DATE_COLUMN, SORT_OPTIONS, sortParams } from './sort.js'

// The columns the backend whitelists (backend/lib/propertyQuery.js SORT_COLUMNS).
const BACKEND_WHITELIST = ['L_SystemPrice', LISTED_DATE_COLUMN, 'LM_Int2_3', 'L_Keyword2']

describe('sort options', () => {
  it('only ever send whitelisted SQL column names, never RESO names', () => {
    for (const o of SORT_OPTIONS) {
      expect(BACKEND_WHITELIST).toContain(o.sortBy)
      expect(['asc', 'desc']).toContain(o.sortOrder)
    }
    expect(SORT_OPTIONS.map((o) => o.sortBy)).not.toContain('ListPrice')
  })

  it('has unique values and covers price, date listed, square feet and beds in both directions', () => {
    const values = SORT_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
    for (const col of BACKEND_WHITELIST) {
      const orders = SORT_OPTIONS.filter((o) => o.sortBy === col).map((o) => o.sortOrder).sort()
      expect(orders).toEqual(['asc', 'desc'])
    }
  })
})

describe('sortParams', () => {
  it('maps an option value to sortBy and sortOrder', () => {
    expect(sortParams('price-asc')).toEqual({ sortBy: 'L_SystemPrice', sortOrder: 'asc' })
    expect(sortParams('beds-desc')).toEqual({ sortBy: 'L_Keyword2', sortOrder: 'desc' })
  })

  it('returns no params for the default or an unknown value', () => {
    expect(sortParams(DEFAULT_SORT)).toEqual({})
    expect(sortParams('nonsense')).toEqual({})
    expect(sortParams(undefined)).toEqual({})
  })
})
