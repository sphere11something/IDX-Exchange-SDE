'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db');
const { parseListingId, MAX_ID_LENGTH } = require('../lib/propertyQuery');
const { getProperty, getOpenHouses } = require('../lib/handlers');
const { requestLogger } = require('../lib/requestLogger');

function fakeRes() {
  return {
    statusCode: 200, body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

// Fake pool: `props` answers the existence check, `openhouses` answers the event query.
function fakePool({ props = [{ L_ListingID: 'A1' }], openhouses = [], fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args });
      if (fail) throw new Error('db down');
      return /FROM rets_openhouse/.test(sql) ? [openhouses] : [props];
    },
  };
}

const quiet = async (fn) => {
  const orig = console.error; console.error = () => {};
  try { return await fn(); } finally { console.error = orig; }
};

// ---- ID validation -------------------------------------------------------
test('valid listing IDs are accepted', () => {
  for (const id of ['A1', 'OC25123456', '12345', 'abc-123_X']) {
    assert.equal(parseListingId(id).error, null, id);
  }
});

test('malformed or oversized IDs are rejected', () => {
  for (const id of ['', '   ', 'a/b', 'abc openhouses', "1' OR '1'='1", '1;DROP TABLE x', 'a'.repeat(MAX_ID_LENGTH + 1), undefined, ['a', 'b']]) {
    assert.ok(parseListingId(id).error, JSON.stringify(id));
  }
});

test('both handlers return 400 for a bad ID without touching the database', async () => {
  for (const handler of [getProperty, getOpenHouses]) {
    const p = fakePool(); const res = fakeRes();
    await handler(p)({ params: { id: 'x'.repeat(500) } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Invalid listing ID');
    assert.equal(p.calls.length, 0);
  }
});

// ---- GET /api/properties/:id --------------------------------------------
test('unknown property -> 404 with a helpful message', async () => {
  const res = fakeRes();
  await getProperty(fakePool({ props: [] }))({ params: { id: 'NOPE1' } }, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /NOPE1/);
});

test('known property -> full object including openHouses', async () => {
  const row = { id: 'A1', photos: '["p1","p2"]', type: 'SingleFamilyResidence' };
  const res = fakeRes();
  await getProperty(fakePool({ props: [row], openhouses: [{ date: '2026-11-01', all_data: '{"OpenHouseRemarks":"Hi"}' }] }))({ params: { id: 'A1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.photos, ['p1', 'p2']);
  assert.equal(res.body.openHouses[0].remarks, 'Hi');
});

// ---- GET /api/properties/:id/openhouses ---------------------------------
test('open houses: property must exist first (404 otherwise), and query is parameterised', async () => {
  const p = fakePool({ props: [] }); const res = fakeRes();
  await getOpenHouses(p)({ params: { id: 'NOPE1' } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(p.calls.length, 1); // never queried rets_openhouse
  assert.deepEqual(p.calls[0].args, ['NOPE1']);
});

test('open houses: existing property with no events -> 200 and []', async () => {
  const res = fakeRes();
  await getOpenHouses(fakePool({ openhouses: [] }))({ params: { id: 'A1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, []);
});

test('open houses: ordered by date then start time, all_data returned as-is', async () => {
  const rows = [{ OpenHouseDate: '2026-11-01', all_data: '{"x":1}' }];
  const p = fakePool({ openhouses: rows }); const res = fakeRes();
  await getOpenHouses(p)({ params: { id: 'A1' } }, res);
  assert.match(p.calls[1].sql, /ORDER BY OpenHouseDate ASC, OH_StartTime ASC/);
  assert.deepEqual(p.calls[1].args, ['A1']);
  assert.deepEqual(res.body, rows);
});

test('open houses: database failure -> 500 JSON, not an unhandled rejection', async () => {
  const res = fakeRes();
  await quiet(() => getOpenHouses(fakePool({ fail: true }))({ params: { id: 'A1' } }, res));
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Server error' });
});

test('getProperty tolerates NULL / malformed / already-parsed all_data', async () => {
  for (const all_data of [null, '{not json', '', { OpenHouseRemarks: 'obj' }]) {
    const res = fakeRes();
    await getProperty(fakePool({ props: [{ id: 'A1', photos: null, type: 'x' }], openhouses: [{ date: 'd', all_data }] }))({ params: { id: 'A1' } }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(all_data));
  }
});

// ---- request logger ------------------------------------------------------
test('logger prints method, URL, status and duration in ms', async () => {
  const lines = [];
  const handlers = {};
  const res = { statusCode: 404, writableFinished: true, on(ev, fn) { handlers[ev] = fn; } };
  requestLogger((l) => lines.push(l))({ method: 'GET', originalUrl: '/api/properties/zzz' }, res, () => {});
  handlers.finish();
  handlers.close(); // finish + close must not double-log
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[\d{4}-\d\d-\d\dT[\d:.]+Z\] GET \/api\/properties\/zzz 404 \d+\.\dms$/);
});

// ---- end to end: route order --------------------------------------------
test('HTTP: /:id/openhouses hits the openhouses handler, /:id the detail handler', async () => {
  const app = require('../server');
  const origQuery = pool.query;
  const seen = [];
  pool.query = async (sql, args) => {
    seen.push(sql);
    if (/FROM rets_openhouse/.test(sql)) return [[{ OpenHouseDate: '2026-11-01' }]];
    if (/SELECT L_ListingID FROM rets_property/.test(sql)) return [[{ L_ListingID: 'A1' }]];
    return [[{ id: 'A1', photos: '[]', type: 'x' }]];
  };
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/properties`;
  const origLog = console.log; console.log = () => {};
  try {
    const oh = await (await fetch(`${base}/A1/openhouses`)).json();
    assert.ok(Array.isArray(oh), 'openhouses must return an array');
    const detail = await (await fetch(`${base}/A1`)).json();
    assert.equal(detail.id, 'A1');
    assert.equal((await fetch(`${base}/bad%20id`)).status, 400);
    assert.equal((await fetch(`${base}/A1/nope`)).status, 404);
  } finally {
    console.log = origLog; pool.query = origQuery; server.close();
  }
});
