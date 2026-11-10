import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'
import PropertyImageGallery from '../components/PropertyImageGallery.jsx'
import PropertyMap from '../components/PropertyMap.jsx'
import { fetchPropertyDetail } from '../api/client.js'
import { parseCoordinates } from '../utils/coordinates.js'
import { formatDay, formatLocation, formatTimeRange, formatType, usd } from '../utils/format.js'
import { getOpenHouseRemarks } from '../utils/openHouse.js'
import { baseOf, searchPath, styleOf } from '../site.js'

export default function DetailPage() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const style = styleOf(pathname)
  const base = baseOf(style)

  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setProperty(null)
    setError(null)
    fetchPropertyDetail(id, { signal: controller.signal })
      .then((p) => {
        if (controller.signal.aborted) return
        // A 200 with no usable body is treated like a missing listing rather than rendering blanks.
        if (!p || typeof p !== 'object') setError('No property found with that listing ID.')
        else setProperty(p)
      })
      .catch((e) => {
        if (e?.name !== 'AbortError' && !controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [id])

  const backTo = property?.forRent ? base + '/rent' : searchPath(style)

  // Go back in history when the user arrived from inside the app (keeps them on the page of
  // results they left); a direct visit to this URL has nothing to go back to, so use the link.
  const goBack = (event) => {
    if (window.history.state?.idx > 0) {
      event.preventDefault()
      navigate(-1)
    }
  }

  const address = property ? formatLocation(property) : ''
  const coordinates = property ? parseCoordinates(property.lat, property.lng) : null
  const openHouses = Array.isArray(property?.openHouses) ? property.openHouses : []
  const kind = property ? formatType(property.type) : null

  const details = property
    ? [
        ['Listing type', property.forRent ? 'For rent' : 'For sale'],
        ['Property type', kind],
        ['Year built', property.yearBuilt || null],
        ['Lot size', Number(property.lotAcres) > 0 ? `${Number(property.lotAcres)} acres` : null],
        ['Listing ID', property.id],
      ].filter(([, value]) => value)
    : []

  return (
    <Shell>
      <div className="detail">
        <Link className="backlink" to={backTo} onClick={goBack}>
          Back to search
        </Link>

        {error && <Notice title="This listing isn't available." message={error} />}
        {!property && !error && <Loading>Loading listing</Loading>}

        {property && (
          <>
            <PropertyImageGallery photos={property.photos} alt={address || 'Property photo'} />

            <div className="detail__head">
              <div>
                <div className="detail__price num">
                  {Number(property.price) > 0 ? usd(property.price) : 'Price unavailable'}
                  {property.forRent && Number(property.price) > 0 && <small>/mo</small>}
                </div>
                <h1 className="sr-only">{address}</h1>
                <p className="detail__addr">{address}</p>
              </div>
              <div className="ledger">
                <div>
                  <b>{property.beds ?? '—'}</b>
                  <span>Beds</span>
                </div>
                <div>
                  <b>{property.baths ? Number(property.baths) : '—'}</b>
                  <span>Baths</span>
                </div>
                <div>
                  <b>{property.sqft ? Number(property.sqft).toLocaleString() : '—'}</b>
                  <span>Sq ft</span>
                </div>
                <div>
                  <b>{property.yearBuilt || '—'}</b>
                  <span>Built</span>
                </div>
              </div>
            </div>

            {property.remarks && (
              <section>
                <h2>About this home</h2>
                <p>{property.remarks}</p>
                {kind && <p className="calc__note">{kind}, listed by CRMLS.</p>}
              </section>
            )}

            {details.length > 0 && (
              <section>
                <h2>Property details</h2>
                <dl className="facts-list">
                  {details.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="num">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section>
              <h2>Open houses</h2>
              {openHouses.length > 0 ? (
                openHouses.map((o, i) => {
                  const times = formatTimeRange(o.startTime, o.endTime)
                  const remarks = getOpenHouseRemarks(o)
                  return (
                    <div className="showing" key={i}>
                      <b>{formatDay(o.date)}</b>
                      {times && <span className="num">{times}</span>}
                      {remarks && <em>{remarks}</em>}
                    </div>
                  )
                })
              ) : (
                <p className="calc__note">No open houses scheduled</p>
              )}
            </section>

            {coordinates && (
              <section>
                <h2>Location</h2>
                <PropertyMap lat={coordinates.lat} lng={coordinates.lng} />
              </section>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
