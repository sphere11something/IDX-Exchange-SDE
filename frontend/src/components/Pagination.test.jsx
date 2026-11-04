import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination.jsx'
import { ELLIPSIS, getPageNumbers } from '../utils/pagination.js'

// onPageChange is a vi.fn() spy: it records what the component asked for, so the test can
// check behaviour without a real page or API behind it.
function setup(props = {}) {
  const onPageChange = vi.fn()
  const utils = render(
    <Pagination currentPage={1} totalPages={10} onPageChange={onPageChange} {...props} />,
  )
  return { onPageChange, ...utils }
}

// The visible sequence, e.g. ['1', '...', '4', '5', '6', '...', '24'] (buttons and gaps in order).
// Uses querySelectorAll rather than getAllByRole because the ellipsis items are aria-hidden,
// and Testing Library's role queries skip hidden elements by default.
const visibleItems = () =>
  Array.from(screen.getByRole('list').querySelectorAll('li')).map((li) => li.textContent)

describe('getPageNumbers', () => {
  it('shows every page with no ellipsis when the pages fit', () => {
    expect(getPageNumbers(1, 1)).toEqual([1])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('uses a trailing ellipsis when the current page is near the start', () => {
    expect(getPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24])
    expect(getPageNumbers(4, 24)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24])
  })

  it('uses ellipses on both sides when the current page is in the middle', () => {
    expect(getPageNumbers(5, 24)).toEqual([1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 24])
    expect(getPageNumbers(12, 24)).toEqual([1, ELLIPSIS, 11, 12, 13, ELLIPSIS, 24])
    expect(getPageNumbers(20, 24)).toEqual([1, ELLIPSIS, 19, 20, 21, ELLIPSIS, 24])
  })

  it('uses a leading ellipsis when the current page is near the end', () => {
    expect(getPageNumbers(21, 24)).toEqual([1, ELLIPSIS, 20, 21, 22, 23, 24])
    expect(getPageNumbers(24, 24)).toEqual([1, ELLIPSIS, 20, 21, 22, 23, 24])
  })

  it('handles the smallest total that needs an ellipsis (8 pages)', () => {
    expect(getPageNumbers(1, 8)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 8])
    expect(getPageNumbers(4, 8)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 8])
    expect(getPageNumbers(5, 8)).toEqual([1, ELLIPSIS, 4, 5, 6, 7, 8])
    expect(getPageNumbers(8, 8)).toEqual([1, ELLIPSIS, 4, 5, 6, 7, 8])
  })

  it('returns nothing when there are no pages, and clamps an out-of-range current page', () => {
    expect(getPageNumbers(1, 0)).toEqual([])
    expect(getPageNumbers(99, 24)).toEqual(getPageNumbers(24, 24))
    expect(getPageNumbers(0, 24)).toEqual(getPageNumbers(1, 24))
  })

  // DEBUG CHALLENGE regression: near the end the bar used to render "1 ... 2 3 4 ... 1", i.e. the
  // last page number showed up twice. Check the exact pages around the end of a 24-page list.
  it('never repeats the last page near the end (regression: "1 ... 2 3 4 ... 1")', () => {
    for (let current = 18; current <= 24; current++) {
      const items = getPageNumbers(current, 24)
      expect(items.filter((x) => x === 24), `last page repeated on page ${current}`).toHaveLength(1)
      expect(items.filter((x) => x === 1), `first page repeated on page ${current}`).toHaveLength(1)
    }
  })

  // Stronger version of the same check: for every total up to 60 and every current page,
  // the list is strictly ascending (so no duplicates), starts at 1, ends at the total,
  // contains the current page, and never has two ellipses next to each other.
  it('is well-formed for every combination of current page and total pages', () => {
    for (let total = 1; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        const items = getPageNumbers(current, total)
        const numbers = items.filter((x) => x !== ELLIPSIS)
        const label = `page ${current} of ${total}: ${items.join(' ')}`

        expect(numbers[0], label).toBe(1)
        expect(numbers[numbers.length - 1], label).toBe(total)
        expect(numbers, label).toContain(current)
        expect(
          numbers.every((n, i) => i === 0 || n > numbers[i - 1]),
          `not strictly ascending (duplicate or out of order) - ${label}`,
        ).toBe(true)
        expect(
          items.every((x, i) => x !== ELLIPSIS || items[i - 1] !== ELLIPSIS),
          `adjacent ellipses - ${label}`,
        ).toBe(true)
      }
    }
  })

  it('only places an ellipsis where pages are actually skipped', () => {
    for (let total = 8; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        const items = getPageNumbers(current, total)
        items.forEach((x, i) => {
          if (x !== ELLIPSIS) return
          // An ellipsis must hide at least one page: its neighbours can't be consecutive numbers.
          expect(items[i + 1] - items[i - 1], `page ${current} of ${total}`).toBeGreaterThan(1)
        })
      }
    }
  })
})

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = setup({ totalPages: 1 })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there are no pages', () => {
    const { container } = setup({ totalPages: 0 })
    expect(container).toBeEmptyDOMElement()
  })

  it('first page: Previous is disabled and Next is enabled', () => {
    setup({ currentPage: 1, totalPages: 10 })

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
  })

  it('last page: Next is disabled and Previous is enabled', () => {
    setup({ currentPage: 10, totalPages: 10 })

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Page 10' })).toHaveAttribute('aria-current', 'page')
  })

  it('middle page: both Previous and Next are enabled', () => {
    setup({ currentPage: 5, totalPages: 10 })

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('only the current page is marked as current', () => {
    setup({ currentPage: 3, totalPages: 5 })

    const current = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('3')
  })

  it('clicking a page number calls onPageChange with that page', () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 5 })

    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }))

    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('clicking the current page does nothing', () => {
    const { onPageChange } = setup({ currentPage: 3, totalPages: 5 })

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('Next and Previous move one page at a time', () => {
    const { onPageChange } = setup({ currentPage: 5, totalPages: 10 })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenLastCalledWith(6)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)
  })

  it('disabled Previous / Next do not fire onPageChange', () => {
    const { onPageChange, rerender } = setup({ currentPage: 1, totalPages: 10 })
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    rerender(<Pagination currentPage={10} totalPages={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('shows all pages without an ellipsis when they fit', () => {
    setup({ currentPage: 2, totalPages: 6 })

    expect(visibleItems()).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('ellipsis: near the start', () => {
    setup({ currentPage: 2, totalPages: 24 })

    expect(visibleItems()).toEqual(['1', '2', '3', '4', '5', '...', '24'])
  })

  it('ellipsis: middle of a large list (1 ... 4 5 6 ... 24)', () => {
    setup({ currentPage: 5, totalPages: 24 })

    expect(visibleItems()).toEqual(['1', '...', '4', '5', '6', '...', '24'])
  })

  it('ellipsis: near the end', () => {
    setup({ currentPage: 23, totalPages: 24 })

    expect(visibleItems()).toEqual(['1', '...', '20', '21', '22', '23', '24'])
  })

  it('regression: the last page number is rendered only once near the end', () => {
    for (const current of [20, 21, 22, 23, 24]) {
      const { unmount } = setup({ currentPage: current, totalPages: 24 })

      const labels = visibleItems()
      expect(labels.filter((t) => t === '24'), `page ${current}`).toHaveLength(1)
      expect(labels.join(' ')).not.toMatch(/^1 \.\.\. 2 3 4 \.\.\. 1$/)
      unmount()
    }
  })

  it('the ellipsis is not a button', () => {
    setup({ currentPage: 12, totalPages: 24 })

    const gaps = screen.getAllByText(ELLIPSIS)
    expect(gaps).toHaveLength(2)
    gaps.forEach((gap) => expect(gap.closest('button')).toBeNull())
  })

  it('updates when the current page changes', () => {
    const onPageChange = vi.fn()
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={24} onPageChange={onPageChange} />,
    )
    expect(visibleItems()).toEqual(['1', '2', '3', '4', '5', '...', '24'])

    rerender(<Pagination currentPage={12} totalPages={24} onPageChange={onPageChange} />)
    expect(visibleItems()).toEqual(['1', '...', '11', '12', '13', '...', '24'])
  })
})

describe('Pagination: go to page', () => {
  const input = () => screen.getByLabelText('Go to page')
  const goButton = () => screen.getByRole('button', { name: 'Go' })
  // Type a value into the box and click Go.
  const jumpTo = (value) => {
    fireEvent.change(input(), { target: { value } })
    fireEvent.click(goButton())
  }

  it('renders a labelled page-number input and a Go button', () => {
    setup({ currentPage: 1, totalPages: 24 })

    expect(input()).toBeInstanceOf(HTMLInputElement)
    expect(input()).toHaveAttribute('type', 'number')
    expect(input()).toHaveAttribute('min', '1')
    expect(input()).toHaveAttribute('max', '24')
    expect(goButton()).toBeInTheDocument()
  })

  it('is not rendered when there is only one page', () => {
    setup({ totalPages: 1 })

    expect(screen.queryByLabelText('Go to page')).not.toBeInTheDocument()
  })

  it('typing a page number and clicking Go jumps to that page', () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 24 })

    jumpTo('17')

    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(17)
  })

  it('pressing Enter in the box jumps to that page', async () => {
    const user = userEvent.setup()
    const { onPageChange } = setup({ currentPage: 1, totalPages: 24 })

    await user.type(input(), '9{Enter}')

    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(9)
  })

  it('clears the box after a successful jump', () => {
    setup({ currentPage: 1, totalPages: 24 })

    jumpTo('5')

    expect(input()).toHaveValue(null) // empty number input
  })

  it('accepts the first and last page', () => {
    const { onPageChange } = setup({ currentPage: 12, totalPages: 24 })

    jumpTo('1')
    expect(onPageChange).toHaveBeenLastCalledWith(1)

    jumpTo('24')
    expect(onPageChange).toHaveBeenLastCalledWith(24)
  })

  it.each([
    ['zero', '0'],
    ['a negative number', '-3'],
    ['one past the last page', '25'],
    ['a huge number', '99999'],
    ['a decimal', '2.5'],
  ])('rejects %s with an error and does not navigate', (_label, value) => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 24 })

    jumpTo(value)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a page number from 1 to 24.')
    expect(onPageChange).not.toHaveBeenCalled()
    // The typed value stays so the user can correct it.
    expect(input()).toHaveValue(Number(value))
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects an empty box with an error and does not navigate', () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 24 })

    fireEvent.click(goButton())

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('treats non-numeric text as empty and shows an error', () => {
    const { onPageChange } = setup({ currentPage: 1, totalPages: 24 })

    jumpTo('abc') // a number input discards text that is not a number

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('does nothing (and shows no error) when you jump to the page you are already on', () => {
    const { onPageChange } = setup({ currentPage: 7, totalPages: 24 })

    jumpTo('7')

    expect(onPageChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input()).toHaveValue(null)
  })

  it('clears the error as soon as the user edits the box', () => {
    setup({ currentPage: 1, totalPages: 24 })
    jumpTo('99')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(input(), { target: { value: '9' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('clears an earlier error after a successful jump', () => {
    setup({ currentPage: 1, totalPages: 24 })
    jumpTo('99')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    jumpTo('3')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uses the real number of pages in its limits and error message', () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={1500} onPageChange={() => {}} />,
    )
    expect(input()).toHaveAttribute('max', '1500')

    fireEvent.change(input(), { target: { value: '1501' } })
    fireEvent.click(goButton())
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a page number from 1 to 1,500.')

    rerender(<Pagination currentPage={1} totalPages={8} onPageChange={() => {}} />)
    expect(input()).toHaveAttribute('max', '8')
  })
})
