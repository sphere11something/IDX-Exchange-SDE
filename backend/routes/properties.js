const express = require('express');
const pool = require('../db');
const { listProperties, mapProperties, getProperty, getOpenHouses } = require('../lib/handlers');

const router = express.Router();

// Mounted at /api/properties in server.js.
// Order matters: Express tries routes top to bottom and the first match wins.
// Literal paths (/map) and the more specific /:id/openhouses must be registered
// BEFORE the /:id wildcard, otherwise the wildcard would claim the request first.
router.get('/', listProperties(pool));
router.get('/map', mapProperties(pool));
router.get('/:id/openhouses', getOpenHouses(pool));
router.get('/:id', getProperty(pool));

module.exports = router;
