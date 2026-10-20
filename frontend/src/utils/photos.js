// L_Photos is not always clean: the API usually returns an array already, but raw rows can
// hold null, '', 'null', a malformed JSON string, or an array containing junk entries.
// This always returns an array of non-empty URL strings and never throws.
export function parsePhotos(value) {
  let list = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return list.filter((u) => typeof u === 'string' && u.trim() !== '')
}

export const firstPhoto = (value) => parsePhotos(value)[0] || null
