import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SearchPage from './SearchPage.jsx'
import { fetchProperties } from '../api/client.js'

// Replace the API with a fake "server" and the Leaflet map with an empty component
// (Leaflet needs a real browser layout, which jsdom doesn't have).
vi.mock('../api/client.js', () => ({ fetchProperties: vi.fn() }))
vi.mock('../MapView.jsx', () => ({ default: () => null }))

const PER_PAGE = 20
let totalRows
let scrollTo

const listing = (n) => ({
  id: `L${n}`,
  price: 500000 + n,
  beds: 3,
  baths: 2,
  sqft: 1800,
  photos: [],
  city: 'Los Angeles',
  address: `${n} Test St`,
})

beforeEach(() => {
  totalRows = 100 // 5 pages of 20
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  // The page sends the URL's query string as params, so `page` arrives as a string, like the backend sees it.
  fetchProperties.mockImplementation(async (params) => {
    const page = Number(params.page ?? 1)
    const offset = (page - 1) * PER_PAGE
    const count = Math.max(0, Math.min(PER_PAGE, totalRows - offset))
    return {
      total: totalRows,
      limit: PER_PAGE,
      offset,
      page,
      pages: Math.ceil(totalRows / PER_PAGE),
      results: Array.from({ length: count }, (_, i) => listing(offset + i + 1)),
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  fetchProperties.mockReset()
})

function renderPage(url = '/for-sale') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/for-sale" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const lastParams = () => fetchProperties.mock.calls.at(-1)[0]
const paginationNav = () => screen.findByRole('navigation', { name: 'Pagination' })
const currentPageButton = () =>
  screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'page')

describe('SearchPage pagination', () => {
  it('shows numbered pagination with a "Go to page" box below the results', async () => {
    const { container } = renderPage()

    const nav = await paginationNav()
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument()
    expect(screen.getByLabelText('Go to page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
    // The controls come after the property grid.
    const grid = container.querySelector('.grid')
    expect(grid.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('starts on the page given in the URL', async () => {
    renderPage('/for-sale?page=3')

    await paginationNav()
    expect(currentPageButton()).toHaveTextContent('3')
    expect(lastParams()).toMatchObject({ page: '3' })
  })

  it('typing a page number and clicking Go loads that page and scrolls to the top', async () => {
    const user = userEvent.setup()
    renderPage()
    await paginationNav()

    await user.type(screen.getByLabelText('Go to page'), '4')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    await screen.findByRole('navigation', { name: 'Pagination' })
    expect(lastParams()).toMatchObject({ page: '4' })
    expect(currentPageButton()).toHaveTextContent('4')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('pressing Enter in the "Go to page" box also jumps', async () => {
    const user = userEvent.setup()
    renderPage()
    await paginationNav()

    await user.type(screen.getByLabelText('Go to page'), '2{Enter}')

    await screen.findByRole('navigation', { name: 'Pagination' })
    expect(lastParams()).toMatchObject({ page: '2' })
    expect(currentPageButton()).toHaveTextContent('2')
  })

  it('"Go to page" keeps the active search filters', async () => {
    const user = userEvent.setup()
    renderPage('/for-sale?q=Irvine&beds=3')
    await paginationNav()

    await user.type(screen.getByLabelText('Go to page'), '5')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    await screen.findByRole('navigation', { name: 'Pagination' })
    expect(lastParams()).toMatchObject({ q: 'Irvine', beds: '3', page: '5' })
  })

  it('an out-of-range page shows an error and makes no request', async () => {
    const user = userEvent.setup()
    renderPage()
    await paginationNav()
    const callsBefore = fetchProperties.mock.calls.length

    await user.type(screen.getByLabelText('Go to page'), '6')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a page number from 1 to 5.')
    expect(fetchProperties.mock.calls.length).toBe(callsBefore)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('page-number buttons and Next still work', async () => {
    renderPage()
    await paginationNav()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('navigation', { name: 'Pagination' })
    expect(lastParams()).toMatchObject({ page: '2' })

    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }))
    await screen.findByRole('navigation', { name: 'Pagination' })
    expect(lastParams()).toMatchObject({ page: '5' })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('uses ellipsis for large result sets', async () => {
    totalRows = 20 * 24 // 24 pages
    renderPage('/for-sale?page=12')

    const nav = await paginationNav()
    const items = Array.from(nav.querySelectorAll('li')).map((li) => li.textContent)
    expect(items).toEqual(['1', '...', '11', '12', '13', '...', '24'])
  })

  it('hides the pagination when everything fits on one page', async () => {
    totalRows = 15
    renderPage()

    await screen.findByText('15 matching listings')
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Go to page')).not.toBeInTheDocument()
  })
})
