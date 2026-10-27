import { beforeEach, describe, expect, test, vi } from 'vitest'
import { clean, fetchProperties, fetchPropertyDetail } from './client.js'

// fetch() is mocked so unit tests never touch the network: they are fast, deterministic,
// and can force success and failure paths on demand.
const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const failure = (status, body) => ({
  ok: false,
  status,
  json: async () => {
    if (body === undefined) throw new Error('not json')
    return body
  },
})

describe('API client', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  test('fetchProperties puts the filters in the query string', async () => {
    fetch.mockResolvedValue(ok({ total: 1, results: [] }))

    await fetchProperties({ city: 'Irvine', minPrice: '300000', beds: '3' })

    const url = fetch.mock.calls[0][0]
    expect(url).toMatch(/^\/api\/properties\?/)
    expect(url).toContain('city=Irvine')
    expect(url).toContain('minPrice=300000')
    expect(url).toContain('beds=3')
  })

  test('empty, null and whitespace-only values are not sent', async () => {
    fetch.mockResolvedValue(ok({ total: 0, results: [] }))

    await fetchProperties({ city: '', zipcode: '   ', beds: null, baths: undefined, maxPrice: '500000' })

    expect(fetch.mock.calls[0][0]).toBe('/api/properties?maxPrice=500000')
  })

  test('returns the parsed JSON on success', async () => {
    const body = { total: 2, limit: 20, offset: 0, results: [{ id: 'a' }] }
    fetch.mockResolvedValue(ok(body))
    await expect(fetchProperties({})).resolves.toEqual(body)
  })

  test('passes fetch options through so a request can be aborted', async () => {
    fetch.mockResolvedValue(ok({ total: 0, results: [] }))
    const controller = new AbortController()
    await fetchProperties({}, { signal: controller.signal })
    expect(fetch.mock.calls[0][1]).toEqual({ signal: controller.signal })
  })

  test('a 400 throws the backend message', async () => {
    fetch.mockResolvedValue(failure(400, { error: 'Bad Request', message: 'minPrice must be a number' }))
    await expect(fetchProperties({ minPrice: 'abc' })).rejects.toThrow('minPrice must be a number')
  })

  test('a 500 with a non-JSON body throws a generic message', async () => {
    fetch.mockResolvedValue(failure(500))
    await expect(fetchProperties({})).rejects.toThrow('The server returned an error (500)')
  })

  test('a network failure throws a friendly message', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchProperties({})).rejects.toThrow('Unable to reach the server')
  })

  test('an aborted request rethrows AbortError instead of a user-facing message', async () => {
    fetch.mockRejectedValue(new DOMException('aborted', 'AbortError'))
    await expect(fetchProperties({})).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('fetchPropertyDetail encodes the listing id', async () => {
    fetch.mockResolvedValue(ok({ id: 'abc 1' }))
    await fetchPropertyDetail('abc 1')
    expect(fetch.mock.calls[0][0]).toBe('/api/properties/abc%201')
  })

  test('clean trims strings and keeps numbers', () => {
    expect(clean({ city: '  Irvine ', beds: 3, zipcode: '' })).toEqual({ city: 'Irvine', beds: 3 })
  })
})
