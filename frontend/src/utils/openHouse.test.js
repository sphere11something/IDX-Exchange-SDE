import { describe, expect, it } from 'vitest'
import { getOpenHouseRemarks } from './openHouse.js'
import { formatTime, formatTimeRange } from './format.js'

describe('getOpenHouseRemarks', () => {
  it('reads OpenHouseRemarks from an all_data JSON string', () => {
    expect(getOpenHouseRemarks({ all_data: '{"OpenHouseRemarks":"Park on the street"}' })).toBe('Park on the street')
  })

  it('reads OpenHouseRemarks from an already-parsed all_data object', () => {
    expect(getOpenHouseRemarks({ all_data: { OpenHouseRemarks: 'Balloons out front' } })).toBe('Balloons out front')
  })

  it('prefers a remarks value the API already extracted', () => {
    expect(getOpenHouseRemarks({ remarks: 'From API', all_data: '{"OpenHouseRemarks":"From blob"}' })).toBe('From API')
  })

  it.each([
    ['null all_data', { all_data: null }],
    ['malformed JSON', { all_data: '{oops' }],
    ['no remarks key', { all_data: '{"Other":1}' }],
    ['blank remarks', { all_data: '{"OpenHouseRemarks":"   "}' }],
    ['no open house at all', null],
  ])('returns null for %s', (_, input) => {
    expect(getOpenHouseRemarks(input)).toBeNull()
  })
})

describe('time formatting', () => {
  it('converts 24-hour database times to 12-hour', () => {
    expect(formatTime('00:00:00')).toBe('12:00 AM')
    expect(formatTime('11:05:00')).toBe('11:05 AM')
    expect(formatTime('12:00:00')).toBe('12:00 PM')
    expect(formatTime('14:30:00')).toBe('2:30 PM')
  })

  it('returns null for bad input', () => {
    expect(formatTime(null)).toBeNull()
    expect(formatTime('soon')).toBeNull()
    expect(formatTime('25:00:00')).toBeNull()
  })

  it('formats ranges and tolerates a missing end time', () => {
    expect(formatTimeRange('11:00:00', '14:00:00')).toBe('11:00 AM - 2:00 PM')
    expect(formatTimeRange('11:00:00', null)).toBe('11:00 AM')
    expect(formatTimeRange(null, null)).toBeNull()
  })
})
