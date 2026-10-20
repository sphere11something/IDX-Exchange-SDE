import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import { Loading, Notice } from '../ui/bits.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import { fetchProperties } from '../api/client.js'
import { baseOf, searchPath, styleOf } from '../site.js'

export default function HomePage() {
  const { pathname } = useLocation()
  const style = styleOf(pathname)
  const base = baseOf(style)
  const navigate = useNavigate()

  const [trending, setTrending] = useState(null)
  const [error, setError] = useState(null)
  const [place, setPlace] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchProperties({ q: 'Los Angeles', limit: 8, sort: 'price_asc' })
      .then((d) => !cancelled && setTrending(d.results))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  const search = (e) => {
    e.preventDefault()
    navigate(searchPath(style) + (place ? '?q=' + encodeURIComponent(place) : ''))
  }

  const paths = [
    [
      'Buying',
      'Filter the whole for-sale feed by price, beds and home type, then read the agent remarks that came with the listing.',
      'Search homes for sale',
      searchPath(style),
    ],
    [
      'Renting',
      'The same search, scoped to lease listings. Rent shows as a monthly figure throughout.',
      'Search rentals',
      base + '/rent',
    ],
    [
      'Financing',
      'Work out what a listing costs each month before you tour it, at a rate and term you choose.',
      'Open the payment calculator',
      base + '/mortgage',
    ],
  ]

  return (
    <Shell>
      <section className="hero gridfield">
        <div className="hero__inner shell">
          <h1>The listings, the map, and the numbers behind them.</h1>
          <p className="hero__lede">
            Search live MLS data across Los Angeles County — for sale and for rent, with open
            houses, agent remarks and every match plotted on one map.
          </p>
          <form className="hunt" onSubmit={search}>
            <input
              className="field"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              aria-label="City, ZIP or address"
              placeholder="City, ZIP or address"
            />
            <button className="btn">Search</button>
          </form>
        </div>
      </section>

      <section className="band">
        <div className="shell">
          <div className="band__head">
            <h2>Lowest asking prices in Los Angeles</h2>
            <p>The eight cheapest active listings in the feed right now.</p>
          </div>
          {error && <Notice title="Couldn't load listings." message={error} />}
          {!trending && !error && <Loading />}
          {trending && (
            <div className="rail">
              {trending.map((p) => (
                <PropertyCard key={p.id} property={p} base={base} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="band band--sunk">
        <div className="shell">
          <div className="band__head">
            <h2>Three ways through the data</h2>
          </div>
          <div className="paths">
            {paths.map(([title, body, cta, to]) => (
              <div className="path" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
                <Link to={to}>{cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell notes">
        <h3>Where this data comes from</h3>
        <p>
          Listings are supplied by CRMLS through an IDX feed and are shown as the listing broker
          filed them, including photos, remarks and scheduled open houses. Prices and availability
          change without notice; confirm anything that matters with the listing agent.
        </p>
      </section>
    </Shell>
  )
}
