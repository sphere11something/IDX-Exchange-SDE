// The database stores missing coordinates as NULL or 0, and the API passes them through, so
// "present" means a real, non-zero number for BOTH latitude and longitude.
export function parseCoordinates(lat, lng) {
  if (lat == null || lng == null || lat === '' || lng === '') return null
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln) || la === 0 || ln === 0) return null
  return { lat: la, lng: ln }
}
