import { Route, Routes } from 'react-router-dom'
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
  return (
    <Routes>
      <Route path="/listings" element={<ListingsPage />} />
      {tree('', '/for-sale')}
      {tree(DARK_BASE, '/homes')}
    </Routes>
  )
}
