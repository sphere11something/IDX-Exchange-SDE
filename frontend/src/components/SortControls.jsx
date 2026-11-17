import { DEFAULT_SORT, SORT_OPTIONS } from '../utils/sort.js'

/**
 * Controlled sort dropdown. The parent owns the value, so it can reset it when the filters
 * change and the select visibly goes back to "Default".
 *   value    - one of SORT_OPTIONS[].value, or DEFAULT_SORT ('')
 *   onChange - called with the new value
 */
export default function SortControls({ value, onChange, disabled = false }) {
  return (
    <div className="sortc">
      <label className="label" htmlFor="sort-by">Sort by</label>
      <select
        id="sort-by"
        className="select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={DEFAULT_SORT}>Default</option>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
