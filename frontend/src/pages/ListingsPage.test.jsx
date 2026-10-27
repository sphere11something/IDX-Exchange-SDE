import { act } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ListingsPage from './ListingsPage.jsx'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const listing = (id, address) => ({
  id, address, city: 'Irvine', state: 'CA', zip: '92618',
  price: 500000, beds: 3, baths: 2, sqft: 1500, photos: [],
})

// The site header also has a search box, so queries are scoped to the filter form.
const renderPage = () => {
  render(
    <MemoryRouter>
      <ListingsPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}
const form = () => within(screen.getByRole('form', { name: 'Property filters' }))

describe('ListingsPage', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  test('shows a helpful message when a search matches nothing', async () => {
    fetch.mockResolvedValue(ok({ total: 0, results: [] }))
    const user = renderPage()
    await screen.findByText(/No properties found/)

    await user.type(form().getByLabelText('City'), 'Nowhere')
    await user.click(form().getByRole('button', { name: 'Search' }))

    expect(await screen.findByText(/No properties match those filters/)).toBeInTheDocument()
  })

  test('searching sends only the non-empty filters, Clear sends none', async () => {
    fetch.mockResolvedValue(ok({ total: 0, results: [] }))
    const user = renderPage()
    await screen.findByText(/No properties found/)

    await user.type(form().getByLabelText('City'), 'Irvine')
    await user.click(form().getByRole('button', { name: 'Search' }))
    await screen.findByText(/No properties match/)
    const searched = fetch.mock.calls.at(-1)[0]
    expect(searched).toContain('city=Irvine')
    expect(searched).not.toContain('beds=')

    await user.click(form().getByRole('button', { name: 'Clear Filters' }))
    await screen.findByText(/No properties found/)
    expect(fetch.mock.calls.at(-1)[0]).not.toContain('city=')
  })

  test('shows an error notice when the backend is unreachable', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to reach the server/)
  })

  // Regression test for the Week 6 debug challenge:
  // Search "Irvine" (slow) -> Clear -> the late Irvine response must NOT replace the cleared list.
  test('a slow response from an older search never overwrites newer results', async () => {
    let resolveIrvine
    fetch.mockImplementation((url) => {
      if (url.includes('city=Irvine')) {
        return new Promise((resolve) => {
          resolveIrvine = () => resolve(ok({ total: 1, results: [listing('2', '9 Irvine Way')] }))
        })
      }
      return Promise.resolve(ok({ total: 1, results: [listing('1', '1 All Listings St')] }))
    })

    const user = renderPage()
    expect(await screen.findByText(/1 All Listings St/)).toBeInTheDocument()

    await user.type(form().getByLabelText('City'), 'Irvine')
    await user.click(form().getByRole('button', { name: 'Search' }))
    await user.click(form().getByRole('button', { name: 'Clear Filters' }))
    expect(await screen.findByText(/1 All Listings St/)).toBeInTheDocument()

    // The stale Irvine response finally arrives.
    await act(async () => resolveIrvine())

    expect(screen.queryByText(/9 Irvine Way/)).not.toBeInTheDocument()
    expect(screen.getByText(/1 All Listings St/)).toBeInTheDocument()
  })
})
