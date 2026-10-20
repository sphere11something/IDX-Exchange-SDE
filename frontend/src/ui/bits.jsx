/** Small shared pieces: loading, failure, filter controls, pagination. */

export const Spinner = () => <div className="spin" role="status" aria-label="Loading" />

export const Loading = ({ children = 'Loading listings' }) => (
  <div className="status" role="status">
    <Spinner />
    {children}
  </div>
)

export function Notice({ title, message, onRetry }) {
  return (
    <div className="notice" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

const SALE_TYPES = ['SingleFamilyResidence', 'Condominium', 'Townhouse', 'Duplex']
const RENT_TYPES = ['Apartment', ...SALE_TYPES]

export function FilterBar({ values, onChange, onSubmit, category }) {
  const rent = category === 'rent'
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value })
  return (
    <form className="filters" onSubmit={onSubmit}>
      <div className="filters__inner">
        <input
          className="field field--q"
          value={values.q}
          onChange={set('q')}
          aria-label="City, ZIP or address"
          placeholder="City, ZIP or address"
        />
        <span className="filters__mode">{rent ? 'For rent' : 'For sale'}</span>
        <select className="select" value={values.type} onChange={set('type')} aria-label="Home type">
          <option value="">Any home type</option>
          {(rent ? RENT_TYPES : SALE_TYPES).map((t) => (
            <option key={t} value={t}>
              {t.replace(/([A-Z])/g, ' $1').trim()}
            </option>
          ))}
        </select>
        <input
          className="field field--money num"
          type="number"
          min="0"
          value={values.minPrice}
          onChange={set('minPrice')}
          aria-label={rent ? 'Minimum rent' : 'Minimum price'}
          placeholder={rent ? 'Min rent' : 'Min price'}
        />
        <input
          className="field field--money num"
          type="number"
          min="0"
          value={values.maxPrice}
          onChange={set('maxPrice')}
          aria-label={rent ? 'Maximum rent' : 'Maximum price'}
          placeholder={rent ? 'Max rent' : 'Max price'}
        />
        <select className="select" value={values.beds} onChange={set('beds')} aria-label="Bedrooms">
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ beds
            </option>
          ))}
        </select>
        <select
          className="select"
          value={values.baths}
          onChange={set('baths')}
          aria-label="Bathrooms"
        >
          <option value="">Any baths</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}+ baths
            </option>
          ))}
        </select>
        <button className="btn">Search</button>
      </div>
    </form>
  )
}

export function Pager({ page, pages, onGo }) {
  if (!pages || pages < 2) return null
  return (
    <div className="pager">
      <button className="btn btn--quiet btn--sm" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        Previous
      </button>
      <span className="num">
        Page {page} of {pages.toLocaleString()}
      </span>
      <button
        className="btn btn--quiet btn--sm"
        disabled={page >= pages}
        onClick={() => onGo(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
