import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DetailPage from './DetailPage.jsx'
import { fetchPropertyDetail } from '../api/client.js'

vi.mock('../api/client.js', () => ({ fetchPropertyDetail: vi.fn() }))

afterEach(() => fetchPropertyDetail.mockReset())

const property = (overrides = {}) => ({
  id: 'A1',
  price: 750000,
  beds: 3,
  baths: 2,
  sqft: 1850,
  yearBuilt: 1998,
  type: 'SingleFamilyResidence',
  address: '12 Oak Ln',
  city: 'Irvine',
  state: 'CA',
  zip: '92618',
  remarks: 'Bright corner lot.',
  lat: 33.68,
  lng: -117.82,
  photos: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
  openHouses: [],
  ...overrides,
})

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/property/:id" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DetailPage', () => {
  it('shows price, address, stats, description and property details', async () => {
    fetchPropertyDetail.mockResolvedValue(property())
    renderAt('/property/A1')

    expect(await screen.findByText('$750,000')).toBeInTheDocument()
    expect(screen.getByText('12 Oak Ln, Irvine, CA 92618')).toBeInTheDocument()
    expect(screen.getByText('1,850')).toBeInTheDocument()
    expect(screen.getAllByText('1998').length).toBeGreaterThan(0)
    expect(screen.getByText('Bright corner lot.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Property details' })).toBeInTheDocument()
    expect(fetchPropertyDetail).toHaveBeenCalledWith('A1', expect.anything())
  })

  it('shows open house date, formatted times and remarks', async () => {
    fetchPropertyDetail.mockResolvedValue(
      property({
        openHouses: [{ date: '2030-03-16', startTime: '11:00:00', endTime: '14:30:00', remarks: 'Free coffee' }],
      }),
    )
    renderAt('/property/A1')

    expect(await screen.findByText('11:00 AM - 2:30 PM')).toBeInTheDocument()
    expect(screen.getByText('Free coffee')).toBeInTheDocument()
    expect(screen.getByText(/Mar 16/)).toBeInTheDocument()
  })

  it('pulls remarks out of the raw all_data JSON when remarks is not set', async () => {
    fetchPropertyDetail.mockResolvedValue(
      property({
        openHouses: [
          {
            date: '2030-03-16',
            startTime: '10:00:00',
            endTime: '12:00:00',
            all_data: JSON.stringify({ OpenHouseRemarks: 'Enter through the side gate' }),
          },
        ],
      }),
    )
    renderAt('/property/A1')

    expect(await screen.findByText('Enter through the side gate')).toBeInTheDocument()
  })

  it('shows "No open houses scheduled" when there are none', async () => {
    fetchPropertyDetail.mockResolvedValue(property({ openHouses: [] }))
    renderAt('/property/A1')

    expect(await screen.findByText('No open houses scheduled')).toBeInTheDocument()
  })

  it('renders the map only when both coordinates are present', async () => {
    fetchPropertyDetail.mockResolvedValue(property())
    const { unmount } = renderAt('/property/A1')
    expect(await screen.findByTitle('Map of this property')).toBeInTheDocument()
    unmount()

    fetchPropertyDetail.mockResolvedValue(property({ lat: null }))
    renderAt('/property/A1')
    await screen.findByText('$750,000')
    expect(screen.queryByTitle('Map of this property')).not.toBeInTheDocument()
  })

  it('shows an error instead of crashing for an invalid listing id', async () => {
    fetchPropertyDetail.mockRejectedValue(new Error('No property found with listing ID nope'))
    renderAt('/property/nope')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("This listing isn't available.")
    expect(alert).toHaveTextContent('No property found with listing ID nope')
  })
})
