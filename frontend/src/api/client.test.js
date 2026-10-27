import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clean, fetchPropertyDetail, fetchProperties } from './client.js'

// WHY WE MOCK fetch(): a unit test checks one piece of code in isolation. If these tests
// called the real fetch(), they would need the Express server and MySQL running, would be
// slow, and would fail whenever the network or data changed, even when our code is correct.
// Replacing fetch with vi.fn() (Vitest's jest.fn()) lets us choose exactly what the "server"
// answers and check exactly what our code asked for.

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body })
const errorResponse = (status, body) => ({
  ok: false,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('not json')
    return body
  },
})

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchProperties', () => {
  it('returns the parsed JSON body on success', async () => {
    const body = { total: 1, results: [{ id: 'A1' }] }
    fetchMock.mockResolvedValue(okResponse(body))

    await expect(fetchProperties({ limit: 20 })).resolves.toEqual(body)
  })

  it('combines multiple filters into one query string', async () => {
    fetchMock.mockResolvedValue(okResponse({ results: [] }))

    await fetchProperties({ city: 'Irvine', minPrice: '300000', beds: '3' })

    const [url] = fetchMock.mock.calls[0]
    const params = new URL(url, 'http://localhost').searchParams
    expect(url.startsWith('/api/properties?')).toBe(true)
    expect(params.get('city')).toBe('Irvine')
    expect(params.get('minPrice')).toBe('300000')
    expect(params.get('beds')).toBe('3')
  })

  it('does not send empty filter values to the API', async () => {
    fetchMock.mockResolvedValue(okResponse({ results: [] }))

    await fetchProperties({ city: '', zipcode: '   ', beds: undefined, baths: null, limit: 20 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/properties?limit=20')
  })

  it('keeps 0 as a real value (minPrice=0 is a valid filter)', async () => {
    fetchMock.mockResolvedValue(okResponse({ results: [] }))

    await fetchProperties({ minPrice: 0 })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/properties?minPrice=0')
  })

  it('passes the AbortSignal through to fetch so a request can be cancelled', async () => {
    fetchMock.mockResolvedValue(okResponse({ results: [] }))
    const controller = new AbortController()

    await fetchProperties({}, { signal: controller.signal })

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('throws a friendly message when the network request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchProperties({})).rejects.toThrow(/Unable to reach the server/)
  })

  it('uses the message from the backend on a 400 error', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(400, { error: 'Bad Request', details: ['minPrice cannot be greater than maxPrice'] }),
    )

    await expect(fetchProperties({ minPrice: 9, maxPrice: 1 })).rejects.toThrow(
      'minPrice cannot be greater than maxPrice',
    )
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(errorResponse(500, undefined))

    await expect(fetchProperties({})).rejects.toThrow('The server returned an error (500)')
  })

  it('rethrows an abort as an AbortError instead of a "server unreachable" message', async () => {
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    await expect(fetchProperties({})).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('fetchPropertyDetail', () => {
  it('encodes the id in the URL', async () => {
    fetchMock.mockResolvedValue(okResponse({ id: 'A/1' }))

    await fetchPropertyDetail('A/1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/properties/A%2F1')
  })

  it('throws the not-found message on a 404', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, { error: 'Not Found', message: 'Listing not found' }))

    await expect(fetchPropertyDetail('nope')).rejects.toThrow('Listing not found')
  })
})

describe('clean', () => {
  it('drops empty strings, whitespace-only strings, null and undefined', () => {
    expect(clean({ a: '', b: '  ', c: null, d: undefined, e: 'x', f: 0 })).toEqual({ e: 'x', f: 0 })
  })
})
