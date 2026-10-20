import { useCallback, useEffect, useState } from 'react'
import { fetchProperties } from '../api/client.js'
import PropertyCard from '../components/PropertyCard.jsx'
import '../listings.css'

const PAGE_SIZE = 20

export default function ListingsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0) // bumping this re-runs the fetch (Retry button)

  useEffect(() => {
    // `cancelled` stops a slow, outdated response from overwriting newer state after unmount.
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProperties({ limit: PAGE_SIZE, offset: 0 })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return (
    <main className="lp-page">
      <h1>Property Listings</h1>

      {loading && <div className="lp-status" role="status"><div className="lp-spinner" />Loading properties...</div>}

      {!loading && error && (
        <div className="lp-error" role="alert">
          <strong>Couldn't load properties.</strong>
          <p>{error}</p>
          <button type="button" onClick={retry}>Try again</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <p className="lp-count">
            Showing {data.results.length.toLocaleString()} of {data.total.toLocaleString()} properties
          </p>
          {data.results.length === 0
            ? <p className="lp-status">No properties found.</p>
            : <div className="lp-grid">{data.results.map((p) => <PropertyCard key={p.id} property={p} />)}</div>}
        </>
      )}
    </main>
  )
}
