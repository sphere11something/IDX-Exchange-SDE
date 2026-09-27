import { useEffect, useState } from 'react'
import { Link, useSearchParams, useParams } from 'react-router-dom'
import MapView from './MapView.jsx'
import { usd, fmtOpen, SiteSwitch, Spinner } from './Zillow.jsx'

const B = '/redfin'
const kind = (t) => t?.replace(/([A-Z])/g, ' $1').trim()

function Shell({ children, flat }) {
  return <div className={'rf' + (flat ? ' flat' : '')}>
    <header className="rfh">
      <SiteSwitch current="redfin" />
      <Link className="rflogo" to={B}>IDX Exchange</Link>
      <nav><Link to={B + '/homes'}>Buy</Link><Link to="/rent">Rent</Link><Link to="/sell">Sell</Link><Link to="/mortgage">Mortgage</Link><Link to="/agents">Find an Agent</Link></nav>
      <nav className="r"><Link to="/help">Help</Link><a className="rfin" href="#">Sign In</a></nav>
    </header>
    {children}
  </div>
}

function Card({ p }) {
  return <Link className="rfc" to={`${B}/property/${p.id}`}>
    <div className="ph" style={{ backgroundImage: p.photos[0] ? `url(${p.photos[0]})` : 'none' }}>
      <span className="tag">{p.nextOpen ? fmtOpen(p.nextOpen) : 'NEW'}</span><span className="hrt">♡</span></div>
    <div className="in"><div className="pr">{usd(p.price)}{p.forRent ? '/mo' : ''}</div>
      <div className="st"><b>{p.beds}</b> beds <b>{Number(p.baths)}</b> baths <b>{p.sqft?.toLocaleString()}</b> sq ft</div>
      <div className="ad">{p.address}, {p.city}, {p.state} {p.zip}</div>
      <div className="br">{kind(p.type)} · CRMLS</div></div></Link>
}

export function RfHome() {
  const [d, setD] = useState(null), [q, setQ] = useState(''), [tab, setTab] = useState('Buy')
  useEffect(() => { fetch('/api/properties?q=Los%20Angeles&limit=8&sort=price_asc').then((r) => r.json()).then(setD) }, [])
  const go = (e) => { e.preventDefault(); location.href = `${B}/homes?q=` + encodeURIComponent(q) }
  return <Shell>
    <section className="rfhero"><h1>Find where you belong</h1>
      <div className="tabs">{['Buy', 'Rent', 'Sell', 'Mortgage', 'Home Estimate'].map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      <form className="rfsearch" onSubmit={go}><input placeholder="City, Address, School, Agent, ZIP" value={q} onChange={(e) => setQ(e.target.value)} /><button>Search</button></form></section>
    <section className="rfsec"><h2>Popular Homes in Los Angeles, CA</h2><p>Hot homes selling fast in your area</p>
      <div className="rfrow">{d ? d.results.map((p) => <Card key={p.id} p={p} />) : <Spinner />}</div></section>
    <section className="rfsec alt"><div className="three">
      {[['Buy with confidence', 'Tour homes with a local agent and get instant answers to your questions.', 'Search homes', B + '/homes'], ['Sell for more', 'Price your home right and reach buyers with an agent who knows your neighborhood.', 'See how it works', '/sell'], ['Finance it', 'Estimate your monthly payment and get pre-approved fast.', 'Calculate payment', '/mortgage']].map((c) => <div key={c[0]}><h3>{c[0]}</h3><p>{c[1]}</p><Link className="rfbtn" to={c[3]}>{c[2]}</Link></div>)}</div></section>
    <footer className="rff">© 2006-2026 IDX Exchange · Listing data provided by CRMLS · Equal Housing Opportunity</footer>
  </Shell>
}

export function RfSearch() {
  const [sp, setSp] = useSearchParams(), [d, setD] = useState(null)
  const [f, setF] = useState({ q: sp.get('q') || 'Los Angeles', minPrice: sp.get('minPrice') || '', maxPrice: sp.get('maxPrice') || '', beds: sp.get('beds') || '', baths: sp.get('baths') || '', type: sp.get('type') || '', sort: sp.get('sort') || '' })
  const q = sp.get('q') || 'Los Angeles', page = +sp.get('page') || 1
  const params = (() => { const n = new URLSearchParams(sp); if (!n.get('q')) n.set('q', 'Los Angeles'); return n })()
  useEffect(() => { setD(null); fetch('/api/properties?' + params).then((r) => r.json()).then(setD) }, [sp])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = (e) => { e.preventDefault(); setSp(Object.fromEntries(Object.entries(f).filter(([, v]) => v))) }
  const go = (p) => { const n = new URLSearchParams(sp); n.set('page', p); setSp(n); window.scrollTo(0, 0) }
  const sort = (e) => { const v = e.target.value, n = new URLSearchParams(sp); v ? n.set('sort', v) : n.delete('sort'); setF({ ...f, sort: v }); setSp(n) }
  return <Shell flat>
    <form className="rffilters" onSubmit={submit}>
      <input className="rfin q" value={f.q} onChange={set('q')} placeholder="City, Address, ZIP" />
      <select value={f.type} onChange={set('type')}><option value="">Home Type</option><option>SingleFamilyResidence</option><option>Condominium</option><option>Townhouse</option><option>Duplex</option></select>
      <input type="number" placeholder="Min price" value={f.minPrice} onChange={set('minPrice')} />
      <input type="number" placeholder="Max price" value={f.maxPrice} onChange={set('maxPrice')} />
      <select value={f.beds} onChange={set('beds')}><option value="">Beds</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
      <select value={f.baths} onChange={set('baths')}><option value="">Baths</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
      <button className="rfbtn">Search</button>
    </form>
    <div className="rfres">
      <div className="rfmap"><MapView params={params} base={B} /></div>
      <div className="rflist">
        <h1>{q}, CA Real Estate &amp; Homes for Sale</h1>
        <div className="cnt"><span>{d ? `${d.total.toLocaleString()} homes` : 'Loading...'}</span>
          <select value={f.sort} onChange={sort}><option value="">Sort: Recommended</option><option value="price_asc">Price (Low to High)</option><option value="price_desc">Price (High to Low)</option></select></div>
        <div className="rfgrid">{!d && <Spinner />}{d?.results.map((p) => <Card key={p.id} p={p} />)}</div>
        {d && <div className="pg"><button disabled={page <= 1} onClick={() => go(page - 1)}>‹ Prev</button><span>Page {page} of {d.pages}</span><button disabled={page >= d.pages} onClick={() => go(page + 1)}>Next ›</button></div>}
      </div>
    </div>
  </Shell>
}

export function RfDetail() {
  const { id } = useParams()
  const [p, setP] = useState(null), [err, setErr] = useState(false)
  useEffect(() => { fetch('/api/properties/' + id).then((r) => (r.ok ? r.json() : Promise.reject())).then(setP).catch(() => setErr(true)) }, [id])
  return <Shell flat>
    <div className="rfdet">
      <Link className="back" to={B + '/homes'}>‹ Back to search</Link>
      {err && <p>Listing not found.</p>}
      {!p && !err && <Spinner />}
      {p && <>
        <div className="gal">{p.photos.slice(0, 5).map((u, i) => <div key={i} style={{ backgroundImage: `url(${u})`, gridRow: i === 0 ? 'span 2' : 'auto' }} />)}</div>
        <div className="top"><div><div className="pr">{usd(p.price)}{p.forRent ? '/mo' : ''}</div><div className="ad">{p.address}, {p.city}, {p.state} {p.zip}</div></div>
          <div className="facts"><div><b>{p.beds}</b>Beds</div><div><b>{Number(p.baths)}</b>Baths</div><div><b>{p.sqft?.toLocaleString()}</b>Sq Ft</div><div><b>{p.yearBuilt || '—'}</b>Built</div></div></div>
        <h2>About this home</h2><p>{p.remarks}</p>
        {p.openHouses.length > 0 && <><h2>Open houses</h2>{p.openHouses.map((o, i) => <div key={i} className="oh"><b>{new Date(String(o.date).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</b> {o.startTime.slice(0, 5)}-{o.endTime.slice(0, 5)}{o.remarks ? ` — ${o.remarks}` : ''}</div>)}</>}
        {p.lat && <iframe title="map" src={`https://maps.google.com/maps?q=${p.lat},${p.lng}&z=15&output=embed`} />}
      </>}
    </div>
  </Shell>
}
