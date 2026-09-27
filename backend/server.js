require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, connectionLimit: 10,
});
const app = express();
app.use(cors());

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(500).json({ status: 'error', database: 'disconnected' }); }
});

const parsePhotos = (s) => { try { return JSON.parse(s) || []; } catch { return []; } };
const SUMMARY = `L_ListingID id, L_Address address, L_City city, L_State state, L_Zip zip,
  L_SystemPrice price, L_Keyword2 beds, LM_Dec_3 baths, LM_Int2_3 sqft, L_Type_ type,
  (SELECT MIN(CONCAT(o.OpenHouseDate,' ',o.OH_StartTime,'|',o.OH_EndTime)) FROM rets_openhouse o WHERE o.L_ListingID = rets_property.L_ListingID AND o.OpenHouseDate >= CURDATE()) nextOpen,
  LMD_MP_Latitude lat, LMD_MP_Longitude lng, YearBuilt yearBuilt, L_Photos photos`;

// Lease/rental listings are identified by L_Type_ values distinct from the for-sale
// residential types (SingleFamilyResidence, Condominium, etc). Configure these to match
// whatever your MLS feed actually uses (check `SELECT DISTINCT L_Type_ FROM rets_property`).
const RENTAL_TYPES = (process.env.RENTAL_PROPERTY_TYPES || 'ResidentialLease,Apartment')
  .split(',').map((s) => s.trim()).filter(Boolean);

function buildWhere(req) {
  const { city, minPrice, maxPrice, beds, baths, type, q, category } = req.query;
  const where = ["L_Status='Active'"], args = [];
  if (category === 'rent') {
    if (RENTAL_TYPES.length) { where.push(`L_Type_ IN (${RENTAL_TYPES.map(() => '?').join(',')})`); args.push(...RENTAL_TYPES); }
  } else if (category === 'sale' && RENTAL_TYPES.length) {
    where.push(`L_Type_ NOT IN (${RENTAL_TYPES.map(() => '?').join(',')})`); args.push(...RENTAL_TYPES);
  }
  if (city) { where.push('L_City = ?'); args.push(city); }
  if (q) { where.push('(L_City LIKE ? OR L_Zip LIKE ? OR L_Address LIKE ?)'); args.push(`${q}%`, `${q}%`, `${q}%`); }
  if (minPrice) { where.push('L_SystemPrice >= ?'); args.push(+minPrice); }
  if (maxPrice) { where.push('L_SystemPrice <= ?'); args.push(+maxPrice); }
  if (beds) { where.push('L_Keyword2 >= ?'); args.push(+beds); }
  if (baths) { where.push('LM_Dec_3 >= ?'); args.push(+baths); }
  if (type) { where.push('L_Type_ = ?'); args.push(type); }
  return { w: where.join(' AND '), args };
}

app.get('/api/properties/map', async (req, res) => {
  try {
    const { w, args } = buildWhere(req);
    const [rows] = await pool.query(
      `SELECT L_ListingID id, L_SystemPrice price, LMD_MP_Latitude lat, LMD_MP_Longitude lng FROM rets_property
       WHERE ${w} AND LMD_MP_Latitude IS NOT NULL AND LMD_MP_Latitude <> 0 AND LMD_MP_Longitude <> 0 LIMIT 1000`, args);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/properties', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 24));
    const { w, args } = buildWhere(req);
    const sorts = { price_asc: 'L_SystemPrice ASC', price_desc: 'L_SystemPrice DESC', newest: 'L_ListingID DESC' };
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM rets_property WHERE ${w}`, args);
    const [rows] = await pool.query(
      `SELECT ${SUMMARY} FROM rets_property WHERE ${w} ORDER BY ${sorts[req.query.sort] || sorts.newest} LIMIT ? OFFSET ?`,
      [...args, limit, (page - 1) * limit]);
    rows.forEach((r) => { r.photos = parsePhotos(r.photos).slice(0, 1); r.forRent = RENTAL_TYPES.includes(r.type); });
    res.json({ total, page, limit, pages: Math.ceil(total / limit), results: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/properties/:id', async (req, res) => {
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
});

app.get('/api/cities', async (req, res) => {
  const [rows] = await pool.query(
    "SELECT L_City city, COUNT(*) n FROM rets_property WHERE L_Status='Active' AND L_City<>'' GROUP BY L_City ORDER BY n DESC LIMIT 100");
  res.json(rows);
});

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 5000, () => console.log('API on', process.env.PORT || 5000));
