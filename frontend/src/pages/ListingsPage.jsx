import { useCallback, useEffect, useState } from 'react'
import { fetchProperties } from '../api/client.js'
import PropertyCard from '../components/PropertyCard.jsx'
import PropertyFilters from '../components/PropertyFilters.jsx'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'

const PAGE_SIZE = 20

export default function ListingsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  // The filters that were last submitted. The form keeps its own draft state, so typing
  // does not fetch anything; only Search / Clear Filters change this object.
  const [filters, setFilters] = useState({})
  const [attempt, setAttempt] = useState(0) // bumping this re-runs the fetch (Retry button)

  useEffect(() => {
    // DEBUG CHALLENGE FIX. Every Search / Clear starts a request, and responses can arrive in a
    // different order than they were sent. Without this guard, the slow response from the FIRST
    // search could land after Clear and flash old results before the newer response replaced it.
    // The cleanup below runs before the next effect, so only the latest request may write state.
    const controller = new AbortController()
    const isStale = () => controller.signal.aborted

    setLoading(true)
    setError(null)
    fetchProperties({ ...filters, limit: PAGE_SIZE, offset: 0 }, { signal: controller.signal })
      .then((d) => { if (!isStale()) setData(d) })
      .catch((e) => { if (!isStale()) setError(e.message) })
      .finally(() => { if (!isStale()) setLoading(false) })

    return () => controller.abort()
  }, [filters, attempt])

  const search = useCallback((next) => setFilters(next), [])
  const clear = useCallback(() => setFilters({}), [])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const hasFilters = Object.keys(filters).length > 0

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
              <p className="status" role="status">
                {hasFilters
                  ? 'No properties found. Try widening your price range, lowering beds or baths, or clearing a filter.'
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
