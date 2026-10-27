import { useCallback, useEffect, useState } from 'react'
import { fetchProperties } from '../api/client.js'
import PropertyCard from '../components/PropertyCard.jsx'
import PropertyFilters from '../components/PropertyFilters.jsx'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'

const PAGE_SIZE = 20

export default function ListingsPage() {
  // The filters that were actually searched. The form keeps its own draft values, and
  // `{}` means "no filters". Every Search/Clear sets a NEW object, which re-runs the fetch.
  const [filters, setFilters] = useState({})
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0) // bumping this re-runs the fetch (Retry button)

  useEffect(() => {
    // Debug-challenge fix (Search -> Clear -> Search flashes the first results):
    // each run owns an AbortController and a `cancelled` flag, and the cleanup below fires
    // when the filters change. A slow response from an OLDER search is therefore aborted /
    // ignored and can never overwrite the results of a newer one.
    const controller = new AbortController()
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProperties({ ...filters, limit: PAGE_SIZE, offset: 0 }, { signal: controller.signal })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled && e.name !== 'AbortError') setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [filters, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const search = useCallback((next) => setFilters(next), [])
  const clear = useCallback(() => setFilters({}), [])
  const filtered = Object.keys(filters).length > 0

  return (
    <Shell>
      <div className="lp-page">
        <h1>Property listings</h1>

        <PropertyFilters onSearch={search} onClear={clear} />

        {loading && <Loading>Loading properties</Loading>}

        {!loading && error && (
          <Notice title="Couldn't load properties." message={error} onRetry={retry} />
        )}

        {!loading && !error && data && (
          <>
            <p className="lp-count num">
              Showing {data.results.length.toLocaleString()} of {data.total.toLocaleString()}{' '}
              properties
            </p>
            {data.results.length === 0 ? (
              <p className="status">
                {filtered
                  ? 'No properties match those filters. Try widening your search or click Clear Filters.'
                  : 'No properties found.'}
              </p>
            ) : (
              <div className="grid">
                {data.results.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
