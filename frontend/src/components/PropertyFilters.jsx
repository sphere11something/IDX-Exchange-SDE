import { useState } from 'react'

export const EMPTY_FILTERS = {
  city: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
}

// Empty values are removed here so they are never sent to the API.
const withoutEmpty = (filters) =>
  Object.fromEntries(
    Object.entries(filters)
      .map(([k, v]) => [k, String(v).trim()])
      .filter(([, v]) => v !== ''),
  )

/**
 * Week 6 filter form. All six inputs live in ONE state object, updated with the spread
 * operator. `onSearch(filters)` receives only the non-empty values; `onClear()` fires after
 * the form has been reset.
 */
export default function PropertyFilters({ onSearch, onClear }) {
  const [values, setValues] = useState(EMPTY_FILTERS)

  const set = (key) => (e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSearch(withoutEmpty(values))
  }

  const clear = () => {
    setValues(EMPTY_FILTERS)
    onClear()
  }

  return (
    <form className="lp-filters" onSubmit={submit} aria-label="Property filters">
      <input
        className="field"
        value={values.city}
        onChange={set('city')}
        aria-label="City"
        placeholder="City"
      />
      <input
        className="field"
        value={values.zipcode}
        onChange={set('zipcode')}
        inputMode="numeric"
        maxLength={5}
        aria-label="ZIP code"
        placeholder="ZIP code"
      />
      <input
        className="field num"
        type="number"
        min="0"
        value={values.minPrice}
        onChange={set('minPrice')}
        aria-label="Min price"
        placeholder="Min price"
      />
      <input
        className="field num"
        type="number"
        min="0"
        value={values.maxPrice}
        onChange={set('maxPrice')}
        aria-label="Max price"
        placeholder="Max price"
      />
      <select className="select" value={values.beds} onChange={set('beds')} aria-label="Beds">
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ beds
          </option>
        ))}
      </select>
      <select className="select" value={values.baths} onChange={set('baths')} aria-label="Baths">
        <option value="">Any baths</option>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}+ baths
          </option>
        ))}
      </select>
      <button type="submit" className="btn">
        Search
      </button>
      <button type="button" className="btn btn--quiet" onClick={clear}>
        Clear Filters
      </button>
    </form>
  )
}
