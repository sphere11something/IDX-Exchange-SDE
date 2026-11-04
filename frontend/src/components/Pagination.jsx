import { ELLIPSIS, getPageNumbers } from '../utils/pagination.js'

/**
 * Page controls: Previous, page numbers (with ellipsis for long lists), Next.
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
    </nav>
  )
}
