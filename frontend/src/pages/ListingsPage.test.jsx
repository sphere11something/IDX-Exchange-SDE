import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ListingsPage from './ListingsPage.jsx'
import { fetchProperties } from '../api/client.js'

// The page talks to the API only through fetchProperties, so we replace it with a fake "server"
// that pages through `totalRows` made-up listings, honouring limit and offset like the backend.
vi.mock('../api/client.js', () => ({ fetchProperties: vi.fn() }))

let totalRows
let scrollTo

const listing = (n) => ({
  id: `L${n}`,
  price: 500000 + n,
  beds: 3,
  baths: 2,
  sqft: 1800,
  photos: [],
  city: 'Irvine',
  address: `${n} Test St`,
})

beforeEach(() => {
  totalRows = 100
  // jsdom doesn't implement scrolling, so spy on it to check the page jumps back to the top.
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  fetchProperties.mockImplementation(async (params) => {
    const offset = Number(params.offset ?? 0)
    const limit = Number(params.limit ?? 20)
    const count = Math.max(0, Math.min(limit, totalRows - offset))
    return {
      total: totalRows,
      limit,
      offset,
      results: Array.from({ length: count }, (_, i) => listing(offset + i + 1)),
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  fetchProperties.mockReset()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ListingsPage />
    </MemoryRouter>,
  )
}

// The most recent request the page made (first argument of the last fetchProperties call).
const lastParams = () => fetchProperties.mock.calls.at(-1)[0]
const currentPageButton = () =>
  screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'page')

describe('ListingsPage pagination', () => {
  it('loads page 1 with 20 items per page and shows the results summary', async () => {
    renderPage()

    expect(await screen.findByText('Showing 1-20 of 100 properties')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ limit: 20, offset: 0 })
    expect(currentPageButton()).toHaveTextContent('1')
  })

  it('shows the pagination controls below the property grid', async () => {
    const { container } = renderPage()

    const nav = await screen.findByRole('navigation', { name: 'Pagination' })
    const grid = container.querySelector('.grid')
    expect(grid).not.toBeNull()
    // DOCUMENT_POSITION_FOLLOWING: the nav comes after the grid in the page.
    expect(grid.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('Previous is disabled on page 1 and Next is disabled on the last page', async () => {
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }))
    expect(await screen.findByText('Showing 81-100 of 100 properties')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })

  it('clicking a page number loads that page and scrolls to the top', async () => {
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(await screen.findByText('Showing 41-60 of 100 properties')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ limit: 20, offset: 40 })
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(currentPageButton()).toHaveTextContent('3')
  })

  it('Next moves to the following page', async () => {
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Showing 21-40 of 100 properties')).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('typing a page number in "Go to page" loads that page and scrolls to the top', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')

    await user.type(screen.getByLabelText('Go to page'), '4')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(await screen.findByText('Showing 61-80 of 100 properties')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ limit: 20, offset: 60 })
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(currentPageButton()).toHaveTextContent('4')
  })

  it('"Go to page" keeps the active filters', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Showing 1-20 of 100 properties')

    await user.type(screen.getByLabelText('Go to page'), '5{Enter}')

    await screen.findByText('Showing 81-100 of 100 properties')
    expect(lastParams()).toMatchObject({ city: 'Irvine', limit: 20, offset: 80 })
  })

  it('"Go to page" with an out-of-range number shows an error and makes no request', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    const callsBefore = fetchProperties.mock.calls.length

    await user.type(screen.getByLabelText('Go to page'), '6')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a page number from 1 to 5.')
    expect(fetchProperties.mock.calls.length).toBe(callsBefore)
    expect(scrollTo).not.toHaveBeenCalled()
    expect(screen.getByText('Showing 1-20 of 100 properties')).toBeInTheDocument()
  })

  it('the last page summary shows the real end of a partial page', async () => {
    totalRows = 45
    renderPage()
    await screen.findByText('Showing 1-20 of 45 properties')

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(await screen.findByText('Showing 41-45 of 45 properties')).toBeInTheDocument()
  })

  it('hides the pagination when there is only one page', async () => {
    totalRows = 15
    renderPage()

    expect(await screen.findByText('Showing 1-15 of 15 properties')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('hides the pagination when there are no results', async () => {
    totalRows = 0
    renderPage()

    expect(await screen.findByText('No properties found.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('keeps the active filters when the page changes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Showing 1-20 of 100 properties')

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await screen.findByText('Showing 21-40 of 100 properties')
    expect(lastParams()).toMatchObject({ city: 'Irvine', limit: 20, offset: 20 })
  })

  it('applying new filters resets to page 1', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    await screen.findByText('Showing 41-60 of 100 properties')

    await user.type(screen.getByLabelText('City'), 'Tustin')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Showing 1-20 of 100 properties')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ city: 'Tustin', offset: 0 })
    expect(currentPageButton()).toHaveTextContent('1')
  })

  it('Clear Filters also resets to page 1 and drops the filters', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Showing 1-20 of 100 properties')
    await user.click(screen.getByRole('button', { name: 'Page 4' }))
    await screen.findByText('Showing 61-80 of 100 properties')

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

    expect(await screen.findByText('Showing 1-20 of 100 properties')).toBeInTheDocument()
    expect(lastParams()).not.toHaveProperty('city')
    expect(lastParams()).toMatchObject({ offset: 0 })
  })

  it('changing filters while on a later page makes a single request for page 1', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    await screen.findByText('Showing 41-60 of 100 properties')
    const callsBefore = fetchProperties.mock.calls.length

    await user.type(screen.getByLabelText('City'), 'Tustin')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Showing 1-20 of 100 properties')

    // Exactly one new request, and it's for page 1; there is no wasted "page 3 with new filters".
    await waitFor(() => expect(fetchProperties.mock.calls.length).toBe(callsBefore + 1))
    expect(lastParams()).toMatchObject({ city: 'Tustin', offset: 0 })
  })

  it('falls back to the last real page if the current page no longer exists', async () => {
    renderPage()
    await screen.findByText('Showing 1-20 of 100 properties')
    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }))
    await screen.findByText('Showing 81-100 of 100 properties')

    // The data shrinks while the user is on page 5, so page 5 now returns no rows.
    totalRows = 30
    fireEvent.click(screen.getByRole('button', { name: 'Previous' })) // -> page 4: offset 60, empty

    expect(await screen.findByText('Showing 21-30 of 30 properties')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ offset: 20 })
  })
})
