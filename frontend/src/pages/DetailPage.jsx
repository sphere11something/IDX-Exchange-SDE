import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'
import { fetchPropertyDetail } from '../api/client.js'
import { parsePhotos } from '../utils/photos.js'
import { formatDay, formatLocation, formatType, usd } from '../utils/format.js'
import { baseOf, searchPath, styleOf } from '../site.js'

export default function DetailPage() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const style = styleOf(pathname)
  const base = baseOf(style)

  const [property, setProperty] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setProperty(null)
    setError(null)
    fetchPropertyDetail(id)
      .then((p) => !cancelled && setProperty(p))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [id])

  const photos = parsePhotos(property?.photos).slice(0, 5)
  const backTo = property?.forRent ? base + '/rent' : searchPath(style)

  return (
    <Shell>
      <div className="detail">
        <Link className="backlink" to={backTo}>
          Back to search
        </Link>

        {error && <Notice title="This listing isn't available." message={error} />}
        {!property && !error && <Loading>Loading listing</Loading>}

        {property && (
          <>
            {photos.length > 0 && (
              <div className="plates">
                {photos.map((url) => (
                  <div key={url} style={{ backgroundImage: `url(${url})` }} role="presentation" />
                ))}
              </div>
            )}

            <div className="detail__head">
              <div>
                <div className="detail__price num">
                  {Number(property.price) > 0 ? usd(property.price) : 'Price unavailable'}
                  {property.forRent && Number(property.price) > 0 && <small>/mo</small>}
                </div>
                <h1 className="sr-only">{formatLocation(property)}</h1>
                <p className="detail__addr">{formatLocation(property)}</p>
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
                  <b>{property.sqft ? property.sqft.toLocaleString() : '—'}</b>
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
                {formatType(property.type) && (
                  <p className="calc__note">
                    {formatType(property.type)}, listed by CRMLS.
                  </p>
                )}
              </section>
            )}

            {property.openHouses?.length > 0 && (
              <section>
                <h2>Open houses</h2>
                {property.openHouses.map((o, i) => (
                  <div className="showing" key={i}>
                    <b>{formatDay(o.date)}</b>
                    <span className="num">
                      {o.startTime.slice(0, 5)} to {o.endTime.slice(0, 5)}
                    </span>
                    {o.remarks && <em>{o.remarks}</em>}
                  </div>
                ))}
              </section>
            )}

            {property.lat && (
              <section>
                <h2>Location</h2>
                <iframe
                  title="Map of this property"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${property.lat},${property.lng}&z=15&output=embed`}
                />
              </section>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
