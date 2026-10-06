'use strict';
// Handler factories take the pool as an argument so tests can pass a fake one.
const { SORTS, RENTAL_TYPES, SUMMARY, parsePhotos, parseQuery, buildWhere } = require('./propertyQuery');

const badRequest = (res, errors) =>
  res.status(400).json({ error: 'Invalid query parameters', details: errors });

// GET /api/properties
const listProperties = (pool) => async (req, res) => {
  const { errors, params } = parseQuery(req.query);
  if (errors.length) return badRequest(res, errors);
  const { limit, offset, sort, filters } = params;

  try {
    const { where, args } = buildWhere(filters);
    // Same where + args for BOTH queries, so `total` always matches the filtered result set.
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM rets_property WHERE ${where}`, args);
    const [rows] = await pool.query(
      `SELECT ${SUMMARY} FROM rets_property WHERE ${where} ORDER BY ${SORTS[sort]} LIMIT ? OFFSET ?`,
      [...args, limit, offset]);
    rows.forEach((r) => { r.photos = parsePhotos(r.photos).slice(0, 1); r.forRent = RENTAL_TYPES.includes(r.type); });
    // `page`/`pages` are extras kept for the existing frontend pager.
    res.json({
      total, limit, offset, results: rows,
      page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

// GET /api/properties/map
const mapProperties = (pool) => async (req, res) => {
  const { errors, params } = parseQuery(req.query);
  if (errors.length) return badRequest(res, errors);
  try {
    const { where, args } = buildWhere(params.filters);
    const [rows] = await pool.query(
      `SELECT L_ListingID id, L_SystemPrice price, LMD_MP_Latitude lat, LMD_MP_Longitude lng FROM rets_property
       WHERE ${where} AND LMD_MP_Latitude IS NOT NULL AND LMD_MP_Latitude <> 0 AND LMD_MP_Longitude <> 0 LIMIT 1000`, args);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

// GET /api/properties/:id
const getProperty = (pool) => async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${SUMMARY}, L_Remarks remarks, LotSizeAcres lotAcres FROM rets_property WHERE L_ListingID = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const p = rows[0]; p.photos = parsePhotos(p.photos); p.forRent = RENTAL_TYPES.includes(p.type);
    const [oh] = await pool.query(
      `SELECT OpenHouseDate date, OH_StartTime startTime, OH_EndTime endTime, all_data FROM rets_openhouse
       WHERE L_ListingID = ? AND OpenHouseDate >= CURDATE() ORDER BY OpenHouseDate`, [req.params.id]);
    p.openHouses = oh.map(({ all_data, ...o }) => {
      let remarks = null; try { remarks = JSON.parse(all_data).OpenHouseRemarks || null; } catch {}
      return { ...o, remarks };
    });
    res.json(p);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

module.exports = { listProperties, mapProperties, getProperty };
