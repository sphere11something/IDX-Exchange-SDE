export const ELLIPSIS = '...'

// Show every page number when there are this many pages or fewer (no ellipsis needed).
// Above this, the list is always exactly 7 slots wide so the controls don't jump around.
const MAX_WITHOUT_ELLIPSIS = 7

/**
 * Build the list of items to render in the pagination bar: page numbers plus ELLIPSIS markers.
 * Page 1 and the last page are always present, and each appears exactly once.
 *
 *   totalPages <= 7        1 2 3 4 5 6 7
 *   near the start         1 2 3 4 5 ... 24
 *   in the middle          1 ... 4 5 6 ... 24
 *   near the end           1 ... 20 21 22 23 24
 *
 * Each range is built so it can never include the first or last page, which are added
 * separately. That guards against the "1 ... 2 3 4 ... 1" duplicate-last-page bug, where a
 * sliding window near the end overlaps the last page and the last page is then appended again.
 */
export function getPageNumbers(currentPage, totalPages) {
  const total = Math.max(0, Math.floor(totalPages) || 0)
  if (total === 0) return []

  // Clamp so an out-of-range currentPage still produces a sensible list.
  const current = Math.min(Math.max(1, Math.floor(currentPage) || 1), total)

  if (total <= MAX_WITHOUT_ELLIPSIS) {
    return range(1, total)
  }

  // Near the start: pages 1-5, then ellipsis, then the last page.
  if (current <= 4) {
    return [...range(1, 5), ELLIPSIS, total]
  }

  // Near the end: first page, ellipsis, then the final 5 pages.
  if (current >= total - 3) {
    return [1, ELLIPSIS, ...range(total - 4, total)]
  }

  // In the middle: first, ellipsis, current +/- 1, ellipsis, last.
  return [1, ELLIPSIS, current - 1, current, current + 1, ELLIPSIS, total]
}

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}
