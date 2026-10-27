import { useState } from 'react'
import { EMPTY_FILTERS, compactFilters } from '../utils/filters.js'

const BED_OPTIONS = [1, 2, 3, 4, 5]
const BATH_OPTIONS = [1, 2, 3, 4]

/**
 * Controlled filter form. All six inputs live in ONE state object and are updated with the
 * spread operator. The parent decides what to do with the result:
 *   onSearch(filters)  - called on submit with only the non-empty filters
 *   onClear()          - called after the form has been reset
 */
export default function PropertyFilters({ onSearch, onClear, disabled = false }) {
  const [values, setValues] = useState(EMPTY_FILTERS)

  const set = (key) => (e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSearch(compactFilters(values))
  }

  const clear = () => {
    setValues(EMPTY_FILTERS)
    onClear()
  }

  return (
    <form className="pf" onSubmit={submit} aria-label="Property filters">
      <div className="pf__grid">
        <div className="pf__item">
          <label className="label" htmlFor="pf-city">City</label>
          <input
            id="pf-city"
            className="field"
            type="text"
            value={values.city}
            onChange={set('city')}
            placeholder="e.g. Irvine"
          />
        </div>

        <div className="pf__item">
          <label className="label" htmlFor="pf-zip">ZIP code</label>
          <input
            id="pf-zip"
            className="field num"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            title="5-digit ZIP code"
            value={values.zipcode}
            onChange={set('zipcode')}
            placeholder="e.g. 92618"
          />
        </div>

        <div className="pf__item">
          <label className="label" htmlFor="pf-min">Min price</label>
          <input
            id="pf-min"
            className="field num"
            type="number"
            min="0"
            value={values.minPrice}
            onChange={set('minPrice')}
            placeholder="No min"
          />
        </div>

        <div className="pf__item">
          <label className="label" htmlFor="pf-max">Max price</label>
          <input
            id="pf-max"
            className="field num"
            type="number"
            min="0"
            value={values.maxPrice}
            onChange={set('maxPrice')}
            placeholder="No max"
          />
        </div>

        <div className="pf__item">
          <label className="label" htmlFor="pf-beds">Beds</label>
          <select id="pf-beds" className="select" value={values.beds} onChange={set('beds')}>
            <option value="">Any</option>
            {BED_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>

        <div className="pf__item">
          <label className="label" htmlFor="pf-baths">Baths</label>
          <select id="pf-baths" className="select" value={values.baths} onChange={set('baths')}>
            <option value="">Any</option>
            {BATH_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pf__actions">
        <button type="submit" className="btn" disabled={disabled}>Search</button>
        <button type="button" className="btn btn--quiet" onClick={clear}>Clear Filters</button>
      </div>
    </form>
  )
}
