require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const propertiesRouter = require('./routes/properties');

const app = express();
app.use(cors());

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(500).json({ status: 'error', database: 'disconnected' }); }
});

app.use('/api/properties', propertiesRouter);

app.get('/api/cities', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT L_City city, COUNT(*) n FROM rets_property WHERE L_Status='Active' AND L_City<>'' GROUP BY L_City ORDER BY n DESC LIMIT 100");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 5000, () => console.log('API on', process.env.PORT || 5000));
