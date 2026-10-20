import { Link, useLocation, useParams } from 'react-router-dom'
import Shell from '../ui/Chrome.jsx'
import MortgagePage from './MortgagePage.jsx'
import { baseOf, searchPath, styleOf } from '../site.js'

const PAGES = {
  sell: ['Sell your home', 'Listing tools for sellers are not part of this build yet.'],
  agents: ['Find an agent', 'Agent profiles are not part of this build yet.'],
  'manage-rentals': ['Manage rentals', 'Landlord tools are not part of this build yet.'],
  advertise: ['Advertise', 'Advertising enquiries are not handled here yet.'],
  help: ['Get help', 'Support articles are not part of this build yet.'],
}

/** Everything the nav links to that has no screen of its own yet, plus the 404. */
export default function StaticPage() {
  const { page } = useParams()
  const { pathname } = useLocation()
  const style = styleOf(pathname)
  const base = baseOf(style)

  if (page === 'mortgage') return <MortgagePage />

  const known = PAGES[page]
  return (
    <Shell>
      <div className="plain">
        <h1>{known ? known[0] : 'That page does not exist'}</h1>
        <p>
          {known
            ? `${known[1]} Search and listing detail are both live — start there.`
            : 'Check the address, or start from the listings below.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to={searchPath(style)}>
            Search listings
          </Link>
          <Link className="btn btn--quiet" to={base || '/'}>
            Go home
          </Link>
        </div>
      </div>
    </Shell>
  )
}
