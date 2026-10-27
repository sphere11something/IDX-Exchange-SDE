// API client for the Express backend. Components call these functions and never use
// fetch() directly, so error handling lives in exactly one place.
// Requests go to /api/* and Vite's dev proxy (vite.config.js) forwards them to Express.

const BASE = '/api'

/**
 * Turn any failure (network down, non-2xx status, bad JSON) into an Error with a
 * message that is safe to show to the user.
 */
async function request(path, params, options = {}) {
  const qs = params ? '?' + new URLSearchParams(params) : ''
  let res
  try {
    res = await fetch(`${BASE}${path}${qs}`, options)
  } catch (err) {
    // An aborted request is intentional (a newer search replaced it), not a failure to report.
    if (err?.name === 'AbortError') throw err
    // fetch() only rejects on network-level failures, e.g. the backend is not running.
    throw new Error('Unable to reach the server. Please check that the backend is running.')
  }

  if (!res.ok) {
    let detail = ''
    try {
      // The backend sends { error, message?, details?: string[] } on failures.
      const body = await res.json()
      detail = body.message || (Array.isArray(body.details) ? body.details.join('; ') : body.error) || ''
    } catch {
      // Body was not JSON (e.g. a proxy error page); fall through to the generic text.
    }
    if (res.status === 404) throw new Error(detail || 'The requested resource was not found.')
    if (res.status === 400) throw new Error(detail || 'The request was invalid.')
    throw new Error(detail || `The server returned an error (${res.status}). Please try again.`)
  }

  try {
    return await res.json()
  } catch {
    throw new Error('The server sent a response that could not be read.')
  }
}

// Drop empty values (including whitespace-only strings) so the backend never receives e.g. ?beds=
export const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  )

/**
 * GET /api/properties -> { total, limit, offset, results, page, pages }
 * `options` is passed to fetch(), e.g. { signal } so a stale request can be aborted.
 */
export const fetchProperties = (params, options) => request('/properties', clean(params), options)

/** GET /api/properties/:id -> full property object (throws a 404 message for unknown ids) */
export const fetchPropertyDetail = (id) => request(`/properties/${encodeURIComponent(id)}`)
