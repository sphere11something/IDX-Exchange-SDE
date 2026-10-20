// Display helpers. The data has nulls and zeros (see guide Appendix A), so each helper
// returns null when there is nothing sensible to show and the caller skips that piece.

export const formatPrice = (price, forRent = false) => {
  const n = Number(price)
  if (!n || n < 0) return 'Price unavailable'
  return '$' + n.toLocaleString() + (forRent ? '/mo' : '')
}

const count = (value, unit) => {
  const n = Number(value)
  return !n || Number.isNaN(n) ? null : `${n} ${unit}`
}

export const formatBeds = (beds) => count(beds, Number(beds) === 1 ? 'bed' : 'beds')
export const formatBaths = (baths) => count(baths, Number(baths) === 1 ? 'bath' : 'baths')

export const formatSqft = (sqft) => {
  const n = Number(sqft)
  return n > 0 ? `${n.toLocaleString()} sq ft` : null
}

export const formatLocation = ({ address, city, state, zip }) => {
  const cityState = [city, state].filter(Boolean).join(', ')
  return [address, [cityState, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export const usd = (n) => '$' + Number(n).toLocaleString()

const hour = (h) => (h % 12 || 12) + (h >= 12 ? 'pm' : 'am')

/** "2026-03-14 11:00:00|14:00:00" -> "Sat 11am-2pm, 3/14". Null when there is none. */
export const formatOpenHouse = (value) => {
  if (!value) return null
  const [startPart, endPart] = value.split('|')
  const [date, startTime] = startPart.split(' ')
  const day = new Date(date + 'T00:00:00')
  if (Number.isNaN(day.getTime())) return null
  const span = `${hour(+startTime.slice(0, 2))}-${hour(+endPart.slice(0, 2))}`
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' })
  return `${weekday} ${span}, ${day.getMonth() + 1}/${day.getDate()}`
}

/** The long form used on the detail page: "Saturday, Mar 14". */
export const formatDay = (value) =>
  new Date(String(value).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

/** "SingleFamilyResidence" -> "Single Family Residence" */
export const formatType = (type) => type?.replace(/([A-Z])/g, ' $1').trim() || null
