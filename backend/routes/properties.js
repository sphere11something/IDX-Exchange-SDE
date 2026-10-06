const express = require('express');
const pool = require('../db');
const { listProperties, mapProperties, getProperty } = require('../lib/handlers');

const router = express.Router();

// Mounted at /api/properties in server.js.
// Order matters: literal paths (/map) must be registered before the /:id wildcard.
router.get('/', listProperties(pool));
router.get('/map', mapProperties(pool));
router.get('/:id', getProperty(pool));

module.exports = router;
