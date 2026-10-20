import { useState } from 'react'
import { Link } from 'react-router-dom'
import { firstPhoto } from '../utils/photos.js'
import { formatPrice, formatBeds, formatBaths, formatSqft, formatLocation } from '../utils/format.js'

export default function PropertyCard({ property }) {
  const { id, price, beds, baths, sqft, forRent, photos } = property
  // Image URLs can expire or 404, so fall back to a placeholder if the <img> fails to load.
  const [broken, setBroken] = useState(false)
  const photo = firstPhoto(photos)
  const stats = [formatBeds(beds), formatBaths(baths), formatSqft(sqft)].filter(Boolean)

  return (
    <Link className="lp-card" to={`/property/${id}`}>
      <div className="lp-photo">
        {photo && !broken
          ? <img src={photo} alt={formatLocation(property)} loading="lazy" onError={() => setBroken(true)} />
          : <div className="lp-nophoto">No photo available</div>}
      </div>
      <div className="lp-body">
        <div className="lp-price">{formatPrice(price, forRent)}</div>
        {stats.length > 0 && <div className="lp-stats">{stats.join(' | ')}</div>}
        <div className="lp-addr">{formatLocation(property)}</div>
      </div>
    </Link>
  )
}
