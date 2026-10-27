// Filter helpers shared by PropertyFilters and ListingsPage.
// Keys match the query parameters the backend accepts (see backend/lib/propertyQuery.js).

export const EMPTY_FILTERS = {
  city: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
}

/**
 * Remove empty values so the API never receives e.g. ?beds= or ?city=%20.
 * Strings are trimmed first. Returns a new object; the input is left untouched.
 */
export function compactFilters(values = {}) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== '' && value != null),
  )
}
