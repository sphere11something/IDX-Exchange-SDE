import { parseCoordinates } from '../utils/coordinates.js'

/**
 * Map for the detail page, using the Google Maps Embed API through a plain <iframe>
 * (no npm package). Renders nothing unless BOTH latitude and longitude are present.
 *
 * The API key comes from REACT_APP_GOOGLE_MAPS_API_KEY in frontend/.env (vite.config.js exposes
 * that prefix). Restart the dev server after editing .env. Without a key the keyless embed is
 * used instead so the map still shows; the Embed API proper needs the key.
 */
export default function PropertyMap({ lat, lng, title = 'Map of this property' }) {
  const point = parseCoordinates(lat, lng)
  if (!point) return null

  const key = import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY
  const q = `${point.lat},${point.lng}`
  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${q}&zoom=15`
    : `https://maps.google.com/maps?q=${q}&z=15&output=embed`

  return (
    <div className="map">
      <iframe title={title} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      <a
        className="map__directions"
        href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Directions
      </a>
    </div>
  )
}
