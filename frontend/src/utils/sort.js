// Sort options for the listings page (Week 9, Option 1).
// `sortBy` values are the ACTUAL rets_property column names the backend whitelists
// (backend/lib/propertyQuery.js SORT_COLUMNS), not RESO names like ListPrice. If your date
// column is not L_ListingDate, change it here and in LISTED_DATE_COLUMN on the backend.

export const LISTED_DATE_COLUMN = 'L_ListingDate'

// The "no sort chosen" state. compactSort() turns it into no query params at all, so the
// backend falls back to its default order (newest listing id first).
export const DEFAULT_SORT = ''

export const SORT_OPTIONS = [
  { value: 'price-asc', label: 'Price: low to high', sortBy: 'L_SystemPrice', sortOrder: 'asc' },
  { value: 'price-desc', label: 'Price: high to low', sortBy: 'L_SystemPrice', sortOrder: 'desc' },
  { value: 'date-desc', label: 'Date listed: newest first', sortBy: LISTED_DATE_COLUMN, sortOrder: 'desc' },
  { value: 'date-asc', label: 'Date listed: oldest first', sortBy: LISTED_DATE_COLUMN, sortOrder: 'asc' },
  { value: 'sqft-desc', label: 'Square feet: largest first', sortBy: 'LM_Int2_3', sortOrder: 'desc' },
  { value: 'sqft-asc', label: 'Square feet: smallest first', sortBy: 'LM_Int2_3', sortOrder: 'asc' },
  { value: 'beds-desc', label: 'Beds: most first', sortBy: 'L_Keyword2', sortOrder: 'desc' },
  { value: 'beds-asc', label: 'Beds: fewest first', sortBy: 'L_Keyword2', sortOrder: 'asc' },
]

/**
 * Query parameters for a sort option value: { sortBy, sortOrder }, or {} for the default or
 * an unknown value (so a bad value can never produce a request the backend would reject).
 */
export function sortParams(value) {
  const option = SORT_OPTIONS.find((o) => o.value === value)
  return option ? { sortBy: option.sortBy, sortOrder: option.sortOrder } : {}
}
