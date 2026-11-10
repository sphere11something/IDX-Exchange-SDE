import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PropertyMap from './PropertyMap.jsx'

afterEach(() => vi.unstubAllEnvs())

describe('PropertyMap', () => {
  it('renders a Maps Embed API iframe for the property location', () => {
    vi.stubEnv('REACT_APP_GOOGLE_MAPS_API_KEY', 'test-key')
    render(<PropertyMap lat={33.68} lng={-117.82} />)

    const src = screen.getByTitle('Map of this property').getAttribute('src')
    expect(src).toContain('https://www.google.com/maps/embed/v1/place')
    expect(src).toContain('key=test-key')
    expect(src).toContain('q=33.68,-117.82')
  })

  it('accepts coordinates that arrive as strings (MySQL DECIMAL columns)', () => {
    vi.stubEnv('REACT_APP_GOOGLE_MAPS_API_KEY', 'test-key')
    render(<PropertyMap lat="33.680000" lng="-117.820000" />)
    expect(screen.getByTitle('Map of this property').getAttribute('src')).toContain('q=33.68,-117.82')
  })

  it('Get Directions opens Google Maps in a new tab', () => {
    render(<PropertyMap lat={33.68} lng={-117.82} />)

    const link = screen.getByRole('link', { name: 'Get Directions' })
    expect(link).toHaveAttribute('href', expect.stringContaining('destination=33.68,-117.82'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it.each([
    ['latitude is missing', { lat: null, lng: -117.82 }],
    ['longitude is missing', { lat: 33.68, lng: undefined }],
    ['both are zero', { lat: 0, lng: 0 }],
    ['values are not numbers', { lat: 'abc', lng: 'def' }],
  ])('renders nothing when %s', (_, coords) => {
    const { container } = render(<PropertyMap {...coords} />)
    expect(container).toBeEmptyDOMElement()
  })
})
