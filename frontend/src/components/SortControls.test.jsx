import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SortControls from './SortControls.jsx'
import { SORT_OPTIONS } from '../utils/sort.js'

describe('SortControls', () => {
  it('renders a labelled select with Default plus every sort option', () => {
    render(<SortControls value="" onChange={() => {}} />)

    const select = screen.getByLabelText('Sort by')
    expect(select).toHaveValue('')
    expect(screen.getAllByRole('option')).toHaveLength(SORT_OPTIONS.length + 1)
    expect(screen.getByRole('option', { name: 'Default' })).toBeInTheDocument()
  })

  it('is controlled: it shows the value it is given', () => {
    render(<SortControls value="price-desc" onChange={() => {}} />)
    expect(screen.getByLabelText('Sort by')).toHaveValue('price-desc')
  })

  it('calls onChange with the option value', async () => {
    const onChange = vi.fn()
    render(<SortControls value="" onChange={onChange} />)

    await userEvent.setup().selectOptions(screen.getByLabelText('Sort by'), 'Price: low to high')

    expect(onChange).toHaveBeenCalledWith('price-asc')
  })
})
