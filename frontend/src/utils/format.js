// Display helpers. The data has nulls and zeros (see guide Appendix A), so each helper
// returns null when there is nothing sensible to show and the caller skips that piece.

export const formatPrice = (price, forRent = false) => {
  const n = Number(price)
  if (!n || n < 0) return 'Price unavailable'
  return '$' + n.toLocaleString() + (forRent ? '/mo' : '')
}

const count = (value, unit) => {
  const n = Number(value)
  return value == null || Number.isNaN(n) ? null : `${n} ${unit}`
}

export const formatBeds = (beds) => count(beds, 'bds')
export const formatBaths = (baths) => count(baths, 'ba')

export const formatSqft = (sqft) => {
  const n = Number(sqft)
  return n > 0 ? `${n.toLocaleString()} sqft` : null
}

export const formatLocation = ({ address, city, state, zip }) => {
  const cityState = [city, state].filter(Boolean).join(', ')
  return [address, [cityState, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}
