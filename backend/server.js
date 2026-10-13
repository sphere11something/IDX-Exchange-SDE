require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const propertiesRouter = require('./routes/properties');
const { requestLogger } = require('./lib/requestLogger');

const app = express();
app.use(requestLogger());   // first, so every request is timed, including 404s and errors
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

// Unknown routes -> JSON 404 instead of Express's default HTML page.
app.use((req, res) => res.status(404).json({ error: 'Not found', message: `No route for ${req.method} ${req.path}` }));

// Last-resort error handler: anything thrown or rejected inside a route that was not
// caught locally ends up here as a JSON 500 instead of an HTML stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
if (require.main === module) {
  // Log, don't die silently, if a promise rejection slips past every handler.
  process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
  app.listen(process.env.PORT || 5000, () => console.log('API on', process.env.PORT || 5000));
}
