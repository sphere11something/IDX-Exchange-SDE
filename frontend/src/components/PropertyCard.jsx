import { useState } from 'react'
import { Link } from 'react-router-dom'
import { firstPhoto } from '../utils/photos.js'
import {
  formatBaths,
  formatBeds,
  formatLocation,
  formatOpenHouse,
  formatSqft,
  formatType,
  usd,
} from '../utils/format.js'

/** The one listing card, used by the home rail, both search pages and /listings. */
export default function PropertyCard({ property, base = '' }) {
  const { id, price, beds, baths, sqft, forRent, photos, nextOpen, type } = property
  // Image URLs can expire or 404, so fall back to a placeholder if the <img> fails to load.
  const [broken, setBroken] = useState(false)
  const photo = firstPhoto(photos)
  const address = formatLocation(property)
  const stats = [formatBeds(beds), formatBaths(baths), formatSqft(sqft)].filter(Boolean)
  const open = formatOpenHouse(nextOpen)
  const kind = formatType(type)

  return (
    <Link className="listing" to={`${base}/property/${id}`}>
      <div className="listing__frame">
        {photo && !broken ? (
          <img src={photo} alt={address} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="listing__blank">No photo available</div>
        )}
        {open && <span className="openhouse">Open {open}</span>}
      </div>
      <div className="listing__body">
        <div className="listing__price num">
          {Number(price) > 0 ? usd(price) : 'Price unavailable'}
          {forRent && Number(price) > 0 && <small>/mo</small>}
        </div>
        {stats.length > 0 && (
          <div className="facts num">
            {stats.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        )}
        <div className="listing__addr">{address}</div>
        <div className="listing__source">
          {kind ? `${kind}, listed by CRMLS` : 'Listed by CRMLS'}
        </div>
      </div>
    </Link>
  )
}
