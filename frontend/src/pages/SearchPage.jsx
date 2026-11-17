import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import { FilterBar, Loading, Notice } from '../ui/bits.jsx'
import Pagination from '../components/Pagination.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import MapView from '../MapView.jsx'
import { fetchProperties } from '../api/client.js'
import { baseOf, styleOf } from '../site.js'
import { SORT_OPTIONS } from '../utils/sort.js'

const DEFAULT_PLACE = 'Los Angeles'
const FILTER_KEYS = ['q', 'minPrice', 'maxPrice', 'beds', 'baths', 'type']

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

  // The sort is kept in the URL as sortBy/sortOrder, so it is shared with the list AND survives a new search.
  const sortBySp = sp.get('sortBy')
  const sortOrderSp = sp.get('sortOrder')
  const sortValue =
    SORT_OPTIONS.find((o) => o.sortBy === sortBySp && o.sortOrder === sortOrderSp)?.value ?? ''

  const submit = (e) => {
    e.preventDefault()
    const next = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (sortBySp && sortOrderSp) Object.assign(next, { sortBy: sortBySp, sortOrder: sortOrderSp })
    setSp(next)
  }

  const goTo = (p) => {
    const next = new URLSearchParams(sp)
    next.set('page', p)
    setSp(next)
    window.scrollTo(0, 0)
  }

  const changeSort = (e) => {
    const option = SORT_OPTIONS.find((o) => o.value === e.target.value)
    const next = new URLSearchParams(sp)
    next.delete('sort') // drop the old named sort so it cannot fight with sortBy
    next.delete('page') // a new order starts from page 1
    if (option) {
      next.set('sortBy', option.sortBy)
      next.set('sortOrder', option.sortOrder)
    } else {
      next.delete('sortBy')
      next.delete('sortOrder')
    }
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
            <select className="select" value={sortValue} onChange={changeSort} aria-label="Sort">
              <option value="">Default</option>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label.replace(/^Price/, money)}
                </option>
              ))}
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
              <Pagination currentPage={page} totalPages={data.pages} onPageChange={goTo} />
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
