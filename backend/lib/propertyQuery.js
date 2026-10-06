'use strict';
// Pure helpers (no Express / MySQL imports) so they can be unit-tested directly.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Whitelist: user input only ever selects a KEY here, never becomes SQL text.
// L_ListingID is a tie-breaker so pages never overlap/skip rows when prices tie.
const SORTS = {
  newest: 'L_ListingID DESC',
  price_asc: 'L_SystemPrice ASC, L_ListingID ASC',
  price_desc: 'L_SystemPrice DESC, L_ListingID DESC',
};

// Lease listings are identified by L_Type_; configurable via RENTAL_PROPERTY_TYPES.
const RENTAL_TYPES = (process.env.RENTAL_PROPERTY_TYPES || 'ResidentialLease,Apartment')
  .split(',').map((s) => s.trim()).filter(Boolean);

const parsePhotos = (s) => { try { return JSON.parse(s) || []; } catch { return []; } };

// rets_property uses non-standard MLS column names; aliases give the API friendly keys.
const SUMMARY = `L_ListingID id, L_Address address, L_City city, L_State state, L_Zip zip,
  L_SystemPrice price, L_Keyword2 beds, LM_Dec_3 baths, LM_Int2_3 sqft, L_Type_ type,
  (SELECT MIN(CONCAT(o.OpenHouseDate,' ',o.OH_StartTime,'|',o.OH_EndTime)) FROM rets_openhouse o WHERE o.L_ListingID = rets_property.L_ListingID AND o.OpenHouseDate >= CURDATE()) nextOpen,
  LMD_MP_Latitude lat, LMD_MP_Longitude lng, YearBuilt yearBuilt, L_Photos photos`;

/**
 * Validate and normalise req.query.
 * Returns { errors: string[], params } — params is only meaningful when errors is empty.
 * Empty-string values (e.g. ?beds=) are treated as "not provided".
 */
function parseQuery(query = {}) {
  const errors = [];

  const raw = (name) => {
    const v = query[name];
    if (v === undefined) return undefined;
    if (typeof v !== 'string') { errors.push(`${name} must be a single value`); return undefined; }
    const t = v.trim();
    return t === '' ? undefined : t;
  };

  const int = (name, { min, max, fallback }) => {
    const v = raw(name);
    if (v === undefined) return fallback;
    if (!/^-?\d+$/.test(v)) { errors.push(`${name} must be a whole number`); return fallback; }
    const n = Number(v);
    if (n < min || n > max) { errors.push(`${name} must be between ${min} and ${max}`); return fallback; }
    return n;
  };

  const num = (name, { max }) => {
    const v = raw(name);
    if (v === undefined) return undefined;
    if (!/^\d+(\.\d+)?$/.test(v)) { errors.push(`${name} must be a non-negative number`); return undefined; }
    const n = Number(v);
    if (n > max) { errors.push(`${name} must be at most ${max}`); return undefined; }
    return n;
  };

  const text = (name, maxLen) => {
    const v = raw(name);
    if (v === undefined) return undefined;
    if (v.length > maxLen) { errors.push(`${name} must be at most ${maxLen} characters`); return undefined; }
    return v;
  };

  const oneOf = (name, allowed) => {
    const v = raw(name);
    if (v === undefined) return undefined;
    if (!allowed.includes(v)) { errors.push(`${name} must be one of: ${allowed.join(', ')}`); return undefined; }
    return v;
  };

  // --- pagination ---
  const limit = int('limit', { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
  let offset = int('offset', { min: 0, max: 1e7, fallback: undefined });
  // Legacy `page` param (used by the existing frontend) -> offset, unless offset is explicit.
  const page = int('page', { min: 1, max: 1e6, fallback: undefined });
  if (offset === undefined) offset = page !== undefined ? (page - 1) * limit : 0;

  // --- filters ---
  const zipcode = raw('zipcode');
  if (zipcode !== undefined && !/^\d{5}$/.test(zipcode)) errors.push('zipcode must be a 5-digit ZIP code');

  const filters = {
    city: text('city', 100),
    zipcode: zipcode !== undefined && /^\d{5}$/.test(zipcode) ? zipcode : undefined,
    minPrice: num('minPrice', { max: 1e10 }),
    maxPrice: num('maxPrice', { max: 1e10 }),
    beds: int('beds', { min: 0, max: 20, fallback: undefined }),
    baths: num('baths', { max: 20 }),
    type: text('type', 50),
    q: text('q', 100),
    category: oneOf('category', ['sale', 'rent']),
  };

  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
    errors.push('minPrice cannot be greater than maxPrice');
  }

  const sort = oneOf('sort', Object.keys(SORTS)) || 'newest';

  return { errors, params: { limit, offset, sort, filters } };
}

/**
 * Build a parameterised WHERE clause. Conditions and values are pushed in lock-step,
 * so the Nth `?` always lines up with args[N]. User input NEVER enters the SQL string.
 */
function buildWhere(filters = {}, rentalTypes = RENTAL_TYPES) {
  const { city, zipcode, minPrice, maxPrice, beds, baths, type, q, category } = filters;
  const where = ["L_Status = 'Active'"];
  const args = [];

  if (category === 'rent' && rentalTypes.length) {
    where.push(`L_Type_ IN (${rentalTypes.map(() => '?').join(',')})`);
    args.push(...rentalTypes);
  } else if (category === 'sale' && rentalTypes.length) {
    where.push(`L_Type_ NOT IN (${rentalTypes.map(() => '?').join(',')})`);
    args.push(...rentalTypes);
  }
  // City casing/whitespace is inconsistent in the data, so normalise BOTH sides.
  // Matches the functional index in sql/week3_indexes.sql.
  if (city !== undefined) { where.push('LOWER(TRIM(L_City)) = LOWER(TRIM(?))'); args.push(city); }
  if (zipcode !== undefined) { where.push('L_Zip = ?'); args.push(zipcode); }
  if (q !== undefined) {
    where.push('(L_City LIKE ? OR L_Zip LIKE ? OR L_Address LIKE ?)');
    args.push(`${q}%`, `${q}%`, `${q}%`);
  }
  // `!== undefined`, not truthiness, so minPrice=0 / beds=0 are real filters.
  if (minPrice !== undefined) { where.push('L_SystemPrice >= ?'); args.push(minPrice); }
  if (maxPrice !== undefined) { where.push('L_SystemPrice <= ?'); args.push(maxPrice); }
  if (beds !== undefined) { where.push('L_Keyword2 >= ?'); args.push(beds); }
  if (baths !== undefined) { where.push('LM_Dec_3 >= ?'); args.push(baths); }
  if (type !== undefined) { where.push('L_Type_ = ?'); args.push(type); }

  return { where: where.join(' AND '), args };
}

module.exports = {
  DEFAULT_LIMIT, MAX_LIMIT, SORTS, RENTAL_TYPES, SUMMARY, parsePhotos, parseQuery, buildWhere,
};
