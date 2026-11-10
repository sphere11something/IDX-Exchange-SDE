// Open house remarks live inside the all_data JSON blob (OpenHouseRemarks), not in their own
// column. The detail endpoint already lifts them into `remarks`, but a raw row, or the
// /api/properties/:id/openhouses endpoint, hands back all_data untouched, either as a JSON
// string (TEXT column) or an already-parsed object (JSON column). This reads it either way
// and never throws, so one malformed row cannot break the whole detail page.
export function getOpenHouseRemarks(openHouse) {
  if (!openHouse) return null
  if (typeof openHouse.remarks === 'string' && openHouse.remarks.trim()) {
    return openHouse.remarks.trim()
  }

  let data = openHouse.all_data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return null
    }
  }
  const remarks = data && typeof data === 'object' ? data.OpenHouseRemarks : null
  return typeof remarks === 'string' && remarks.trim() ? remarks.trim() : null
}
