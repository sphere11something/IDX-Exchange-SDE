import { useId, useState } from 'react'
import { ELLIPSIS, getPageNumbers } from '../utils/pagination.js'

/**
 * Page controls: Previous, page numbers (with ellipsis for long lists), Next, and a
 * "Go to page" box for typing a page number directly.
 * Renders nothing when there is only one page.
 *
 * Props:
 *   currentPage   1-based active page
 *   totalPages    total number of pages
 *   onPageChange  called with the new page number when the user picks a page
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  const items = getPageNumbers(currentPage, totalPages)
  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        disabled={isFirst}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      <ul className="pagination__list">
        {items.map((item, i) =>
          item === ELLIPSIS ? (
            // Two ellipses can appear, so the key includes the position.
            <li key={`ellipsis-${i}`} className="pagination__gap" aria-hidden="true">
              {ELLIPSIS}
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={
                  'btn btn--sm pagination__page num' + (item === currentPage ? '' : ' btn--quiet')
                }
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                onClick={() => {
                  if (item !== currentPage) onPageChange(item)
                }}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className="btn btn--quiet btn--sm"
        disabled={isLast}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>

      <GoToPage currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </nav>
  )
}

/**
 * "Go to page" form. Pressing Enter or clicking Go jumps to the typed page. Anything that is not
 * a whole number between 1 and totalPages shows an error and does not navigate, so a typo never
 * sends the user somewhere unexpected. It lives in its own component so it owns its own state
 * (the typed text and the error) without affecting the early return in Pagination.
 */
function GoToPage({ currentPage, totalPages, onPageChange }) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    const text = value.trim()
    const page = Number(text)
    if (text === '' || !Number.isInteger(page) || page < 1 || page > totalPages) {
      setError(`Enter a page number from 1 to ${totalPages.toLocaleString()}.`)
      return
    }

    setError('')
    setValue('')
    // Already on that page: nothing to load, just clear the box.
    if (page !== currentPage) onPageChange(page)
  }

  return (
    <form className="pagination__jump" onSubmit={handleSubmit} noValidate>
      <label className="pagination__jump-label" htmlFor={inputId}>
        Go to page
      </label>
      <input
        id={inputId}
        className="field pagination__jump-input num"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        value={value}
        placeholder={`1-${totalPages.toLocaleString()}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setValue(e.target.value)
          if (error) setError('')
        }}
      />
      <button type="submit" className="btn btn--quiet btn--sm">
        Go
      </button>
      {error && (
        <p id={errorId} className="pagination__jump-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
