import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { baseOf, counterpart, searchPath, styleOf } from '../site.js'

function StyleSwitch({ style }) {
  const { pathname, search } = useLocation()
  return (
    <div className="styleswitch">
      <Link to={counterpart(pathname, search, 'light')} aria-current={style === 'light'}>
        Light
      </Link>
      <Link to={counterpart(pathname, search, 'dark')} aria-current={style === 'dark'}>
        Dark
      </Link>
    </div>
  )
}

function Masthead({ style }) {
  const base = baseOf(style)
  const links = [
    ['Buy', searchPath(style)],
    ['Rent', base + '/rent'],
    ['Sell', base + '/sell'],
    ['Mortgage', base + '/mortgage'],
    ['Agents', base + '/agents'],
  ]
  return (
    <header className="masthead">
      <div className="masthead__inner shell">
        <Link className="wordmark" to={base || '/'}>
          <span className="wordmark__mark" aria-hidden="true" />
          IDX Exchange
        </Link>
        <nav className="navset navset--primary" aria-label="Main">
          {links.map(([label, to]) => (
            <NavLink key={label} className="navlink" to={to} end>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="navset navset--end">
          <NavLink className="navlink" to={base + '/manage-rentals'}>
            Manage rentals
          </NavLink>
          <NavLink className="navlink" to={base + '/help'}>
            Help
          </NavLink>
          <a className="navlink navlink--signin" href="#signin">
            Sign in
          </a>
          <StyleSwitch style={style} />
        </div>
      </div>
    </header>
  )
}

function Footer({ style }) {
  const base = baseOf(style)
  return (
    <footer className="footer">
      <div className="footer__inner shell">
        <nav aria-label="Footer">
          <Link to={searchPath(style)}>Homes for sale</Link>
          <Link to={base + '/rent'}>Rentals</Link>
          <Link to="/listings">All listings</Link>
          <Link to={base + '/mortgage'}>Payment calculator</Link>
          <Link to={base + '/help'}>Help</Link>
        </nav>
        <p>Listing data from CRMLS. Equal housing opportunity.</p>
      </div>
    </footer>
  )
}

/** Page frame. The style comes from the URL tree, so a link is enough to switch it. */
export default function Shell({ children, flush }) {
  const { pathname } = useLocation()
  const style = styleOf(pathname)

  useEffect(() => {
    document.documentElement.dataset.theme = style
  }, [style])

  return (
    <>
      <Masthead style={style} />
      <main>{children}</main>
      {!flush && <Footer style={style} />}
    </>
  )
}
