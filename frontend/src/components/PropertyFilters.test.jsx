import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PropertyFilters from './PropertyFilters.jsx'

// onSearch / onClear are vi.fn() "spies": they record how the component called them, so we can
// check the component's output without needing a real page or API behind it.
function setup() {
  const onSearch = vi.fn()
  const onClear = vi.fn()
  const user = userEvent.setup()
  render(<PropertyFilters onSearch={onSearch} onClear={onClear} />)
  return { onSearch, onClear, user }
}

describe('PropertyFilters', () => {
  it('renders all six inputs and both buttons', () => {
    setup()

    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('ZIP code')).toBeInTheDocument()
    expect(screen.getByLabelText('Min price')).toBeInTheDocument()
    expect(screen.getByLabelText('Max price')).toBeInTheDocument()
    expect(screen.getByLabelText('Beds')).toBeInstanceOf(HTMLSelectElement)
    expect(screen.getByLabelText('Baths')).toBeInstanceOf(HTMLSelectElement)
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()
  })

  it('submits several filters combined, using the API parameter names', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.type(screen.getByLabelText('ZIP code'), '92618')
    await user.type(screen.getByLabelText('Min price'), '300000')
    await user.type(screen.getByLabelText('Max price'), '900000')
    await user.selectOptions(screen.getByLabelText('Beds'), '3')
    await user.selectOptions(screen.getByLabelText('Baths'), '2')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith({
      city: 'Irvine',
      zipcode: '92618',
      minPrice: '300000',
      maxPrice: '900000',
      beds: '3',
      baths: '2',
    })
  })

  it('leaves empty values out of the submitted filters', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    // Only city was filled in, so nothing else (and no empty strings) is sent.
    expect(onSearch).toHaveBeenCalledWith({ city: 'Irvine' })
  })

  it('submits an empty object when nothing is filled in, and trims whitespace', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('City'), '   ')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledWith({})
  })

  it('Clear Filters resets every input and tells the parent', async () => {
    const { onSearch, onClear, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.type(screen.getByLabelText('Min price'), '300000')
    await user.selectOptions(screen.getByLabelText('Beds'), '4')

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

    expect(screen.getByLabelText('City')).toHaveValue('')
    expect(screen.getByLabelText('Min price')).toHaveValue(null) // empty number input
    expect(screen.getByLabelText('Beds')).toHaveValue('')
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('after Clear, a new search does not carry over the old values', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))
    await user.type(screen.getByLabelText('City'), 'Tustin')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenLastCalledWith({ city: 'Tustin' })
  })
})
