// Two visual styles share one set of pages. "light" lives at the root, "dark" lives
// under /redfin (kept so existing links and bookmarks still resolve). This module owns
// the mapping between the two URL trees so the style switch never loses your place.

export const DARK_BASE = '/redfin'

export const styleOf = (pathname) =>
  pathname === DARK_BASE || pathname.startsWith(DARK_BASE + '/') ? 'dark' : 'light'

// Paths that differ between the trees, light path -> dark path.
const PAIRS = [['/for-sale', '/homes']]

const toDark = (p) => PAIRS.find(([light]) => light === p)?.[1] ?? p
const toLight = (p) => PAIRS.find(([, dark]) => dark === p)?.[0] ?? p

/** The same page in the other style, keeping the query string. */
export function counterpart(pathname, search, target) {
  const current = styleOf(pathname)
  if (current === target) return pathname + search
  const bare = current === 'dark' ? pathname.slice(DARK_BASE.length) || '/' : pathname
  if (target === 'light') return toLight(bare) + search
  const dark = toDark(bare)
  return DARK_BASE + (dark === '/' ? '' : dark) + search
}

/** Prefix for links that stay inside the current tree. */
export const baseOf = (style) => (style === 'dark' ? DARK_BASE : '')

export const searchPath = (style) => (style === 'dark' ? DARK_BASE + '/homes' : '/for-sale')
