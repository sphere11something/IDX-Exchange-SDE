import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PropertyFilters from './PropertyFilters.jsx'

function setup() {
  const onSearch = vi.fn()
  const onClear = vi.fn()
  render(<PropertyFilters onSearch={onSearch} onClear={onClear} />)
  return { onSearch, onClear, user: userEvent.setup() }
}

describe('PropertyFilters', () => {
  test('renders all six inputs plus Search and Clear Filters buttons', () => {
    setup()
    for (const label of ['City', 'ZIP code', 'Min price', 'Max price', 'Beds', 'Baths']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()
  })

  test('submitting combined filters calls onSearch with those values', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.type(screen.getByLabelText('Min price'), '300000')
    await user.selectOptions(screen.getByLabelText('Beds'), '3')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith({ city: 'Irvine', minPrice: '300000', beds: '3' })
  })

  test('empty filter values are not passed to onSearch', async () => {
    const { onSearch, user } = setup()

    await user.type(screen.getByLabelText('ZIP code'), '92618')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledWith({ zipcode: '92618' })
  })

  test('searching an untouched form sends an empty object', async () => {
    const { onSearch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenCalledWith({})
  })

  test('Clear Filters resets every input and calls onClear', async () => {
    const { onClear, user } = setup()

    await user.type(screen.getByLabelText('City'), 'Irvine')
    await user.type(screen.getByLabelText('Max price'), '900000')
    await user.selectOptions(screen.getByLabelText('Baths'), '2')
    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

    expect(screen.getByLabelText('City')).toHaveValue('')
    expect(screen.getByLabelText('Max price')).toHaveValue(null)
    expect(screen.getByLabelText('Baths')).toHaveValue('')
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
