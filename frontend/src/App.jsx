import { Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import ListingsPage from './pages/ListingsPage.jsx'
import StaticPage from './pages/StaticPage.jsx'
import { DARK_BASE } from './site.js'

// The same pages are mounted twice: at the root in the light style, and under
// /redfin in the dark style. The header switch moves between the two trees.
const tree = (prefix, searchPath) => (
  <>
    <Route path={prefix || '/'} element={<HomePage />} />
    <Route path={prefix + searchPath} element={<SearchPage category="sale" />} />
    <Route path={prefix + '/rent'} element={<SearchPage category="rent" />} />
    <Route path={prefix + '/property/:id'} element={<DetailPage />} />
    <Route path={prefix + '/:page'} element={<StaticPage />} />
  </>
)

export default function App() {
  const { pathname } = useLocation()
  return (
    // A render error on one page shows a recovery screen instead of a blank app. The boundary
    // resets whenever the path changes, so navigating away from a broken page works.
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/listings" element={<ListingsPage />} />
        {tree('', '/for-sale')}
        {tree(DARK_BASE, '/homes')}
      </Routes>
    </ErrorBoundary>
  )
}
