import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import { FilterBar, Loading, Notice, Pager } from '../ui/bits.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import MapView from '../MapView.jsx'
import { fetchProperties } from '../api/client.js'
import { baseOf, styleOf } from '../site.js'

const DEFAULT_PLACE = 'Los Angeles'
const FILTER_KEYS = ['q', 'minPrice', 'maxPrice', 'beds', 'baths', 'type', 'sort']

/** /for-sale, /rent and their dark-style twins. One layout, two categories. */
export default function SearchPage({ category = 'sale' }) {
  const [sp, setSp] = useSearchParams()
  const { pathname } = useLocation()
  const base = baseOf(styleOf(pathname))
  const rent = category === 'rent'

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(FILTER_KEYS.map((k) => [k, sp.get(k) || (k === 'q' ? DEFAULT_PLACE : '')])),
  )

  const place = sp.get('q') || DEFAULT_PLACE
  const page = +sp.get('page') || 1

  // One query object drives both the list and the map, so the pins always match the index.
  const query = useMemo(() => {
    const next = new URLSearchParams(sp)
    if (!next.get('q')) next.set('q', DEFAULT_PLACE)
    if (rent) next.set('category', 'rent')
    return next
  }, [sp, rent])

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    fetchProperties(Object.fromEntries(query))
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [query])

  const submit = (e) => {
    e.preventDefault()
    setSp(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
  }

  const goTo = (p) => {
    const next = new URLSearchParams(sp)
    next.set('page', p)
    setSp(next)
    window.scrollTo(0, 0)
  }

  const sortBy = (e) => {
    const value = e.target.value
    setFilters({ ...filters, sort: value })
    const next = new URLSearchParams(sp)
    if (value) next.set('sort', value)
    else next.delete('sort')
    setSp(next)
  }

  const money = rent ? 'Rent' : 'Price'

  return (
    <Shell flush>
      <FilterBar values={filters} onChange={setFilters} onSubmit={submit} category={category} />
      <div className="results">
        <div className="results__map">
          <MapView params={query} base={base} />
        </div>
        <div className="results__index">
          <h1>
            {rent ? `Rentals in ${place}` : `Homes for sale in ${place}`}
          </h1>
          <div className="tally">
            <span className="num">
              {data ? `${data.total.toLocaleString()} matching listings` : 'Counting listings'}
            </span>
            <select className="select" value={filters.sort} onChange={sortBy} aria-label="Sort">
              <option value="">Newest first</option>
              <option value="price_asc">{money}, low to high</option>
              <option value="price_desc">{money}, high to low</option>
            </select>
          </div>

          {error && <Notice title="Couldn't load listings." message={error} />}
          {!data && !error && <Loading />}

          {data && data.results.length === 0 && (
            <p className="status">
              Nothing matches these filters yet. Widen the price range or clear the home type.
            </p>
          )}

          {data && data.results.length > 0 && (
            <>
              <div className="grid">
                {data.results.map((p) => (
                  <PropertyCard key={p.id} property={p} base={base} />
                ))}
              </div>
              <Pager page={page} pages={data.pages} onGo={goTo} />
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
