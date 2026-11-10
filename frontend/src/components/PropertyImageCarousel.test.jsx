import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PropertyCard from './PropertyCard.jsx'
import PropertyImageCarousel from './PropertyImageCarousel.jsx'

const photos = ['https://img.test/a.jpg', 'https://img.test/b.jpg', 'https://img.test/c.jpg']

describe('PropertyImageCarousel', () => {
  it('shows the first photo with an "X / Y" counter', () => {
    render(<PropertyImageCarousel photos={photos} alt="123 Main St" />)
    expect(screen.getByRole('img', { name: '123 Main St' })).toHaveAttribute('src', photos[0])
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('parses L_Photos when it arrives as a JSON string', () => {
    render(<PropertyImageCarousel photos={JSON.stringify(photos)} alt="x" />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('arrows cycle through the photos and wrap around', async () => {
    const user = userEvent.setup()
    render(<PropertyImageCarousel photos={photos} alt="x" />)

    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[1])
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByRole('img')).toHaveAttribute('src', photos[2])
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('hides the arrows and counter when there is only one photo', () => {
    render(<PropertyImageCarousel photos={[photos[0]]} alt="x" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/\//)).not.toBeInTheDocument()
  })

  it('falls back to a placeholder for empty or malformed photo data', () => {
    const { rerender } = render(<PropertyImageCarousel photos={null} alt="x" />)
    expect(screen.getByText('No photo available')).toBeInTheDocument()
    rerender(<PropertyImageCarousel photos="{not json" alt="x" />)
    expect(screen.getByText('No photo available')).toBeInTheDocument()
  })
})

describe('PropertyImageCarousel inside a listing card', () => {
  const property = { id: 'A1', price: 500000, beds: 3, baths: 2, sqft: 1800, address: '1 Test St', photos }

  const renderCard = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<PropertyCard property={property} />} />
          <Route path="/property/:id" element={<p>detail page</p>} />
        </Routes>
      </MemoryRouter>,
    )

  it('arrow clicks change the photo but do not navigate to the detail page', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Next photo' }))

    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.queryByText('detail page')).not.toBeInTheDocument()
  })

  it('clicking the card itself navigates to /property/:id', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByText('1 Test St'))

    expect(screen.getByText('detail page')).toBeInTheDocument()
  })
})
