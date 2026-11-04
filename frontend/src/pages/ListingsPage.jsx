import { useCallback, useEffect, useState } from 'react'
import { fetchProperties } from '../api/client.js'
import Pagination from '../components/Pagination.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import PropertyFilters from '../components/PropertyFilters.jsx'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'

const DEFAULT_ITEMS_PER_PAGE = 20

export default function ListingsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  // The filters that were last submitted. The form keeps its own draft state, so typing
  // does not fetch anything; only Search / Clear Filters change this object.
  const [filters, setFilters] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [attempt, setAttempt] = useState(0) // bumping this re-runs the fetch (Retry button)

  useEffect(() => {
    // DEBUG CHALLENGE FIX. Every Search / Clear / page change starts a request, and responses can
    // arrive in a different order than they were sent. Without this guard, a slow response could
    // land after a newer one and flash old results before being replaced. The cleanup below runs
    // before the next effect, so only the latest request may write state.
    const controller = new AbortController()
    const isStale = () => controller.signal.aborted

    setLoading(true)
    setError(null)
    fetchProperties(
      { ...filters, limit: itemsPerPage, offset: (currentPage - 1) * itemsPerPage },
      { signal: controller.signal },
    )
      .then((d) => { if (!isStale()) setData(d) })
      .catch((e) => { if (!isStale()) setError(e.message) })
      .finally(() => { if (!isStale()) setLoading(false) })

    return () => controller.abort()
  }, [filters, currentPage, itemsPerPage, attempt])

  // Changing filters always goes back to page 1. Both updates are batched into one render,
  // so this triggers a single request rather than one for the old page and one for page 1.
  const search = useCallback((next) => {
    setFilters(next)
    setCurrentPage(1)
  }, [])
  const clear = useCallback(() => {
    setFilters({})
    setCurrentPage(1)
  }, [])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Filters stay in state while the page changes, so they are preserved automatically.
  const goToPage = useCallback((page) => {
    setCurrentPage(page)
    window.scrollTo(0, 0)
  }, [])

  const hasFilters = Object.keys(filters).length > 0
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / itemsPerPage)

  // If the result set shrank under us (e.g. the data changed) and this page no longer exists,
  // fall back to the last real page instead of showing an empty grid.
  useEffect(() => {
    if (!loading && !error && data && data.results.length === 0 && total > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [loading, error, data, total, currentPage, totalPages])

  const firstShown = (currentPage - 1) * itemsPerPage + 1
  const lastShown = (currentPage - 1) * itemsPerPage + (data?.results.length ?? 0)

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
              {data.results.length > 0
                ? `Showing ${firstShown.toLocaleString()}-${lastShown.toLocaleString()} of ${total.toLocaleString()} properties`
                : `Showing 0 of ${total.toLocaleString()} properties`}
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </Shell>
  )
}
