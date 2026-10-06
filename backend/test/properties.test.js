'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQuery, buildWhere } = require('../lib/propertyQuery');
const { listProperties } = require('../lib/handlers');

// ---- helpers -------------------------------------------------------------
const placeholders = (sql) => (sql.match(/\?/g) || []).length;

function fakeRes() {
  return {
    statusCode: 200, body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

// Fake pool: records every query; answers COUNT and SELECT like MySQL would.
function fakePool({ total = 87, rows = [], fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args });
      if (fail) throw new Error('db down');
      return /COUNT\(\*\)/.test(sql) ? [[{ total }]] : [rows];
    },
  };
}

// ---- validation ----------------------------------------------------------
test('defaults: limit 20, offset 0, newest sort, no filters', () => {
  const { errors, params } = parseQuery({});
  assert.deepEqual(errors, []);
  assert.equal(params.limit, 20);
  assert.equal(params.offset, 0);
  assert.equal(params.sort, 'newest');
});

test('rejects the invalid inputs from the acceptance criteria', () => {
  for (const q of [{ minPrice: 'abc' }, { limit: '0' }, { limit: '200' }]) {
    assert.ok(parseQuery(q).errors.length > 0, JSON.stringify(q));
  }
});

test('rejects other bad inputs with descriptive messages', () => {
  const cases = [
    [{ limit: '-5' }, /limit must be between 1 and 100/],
    [{ limit: '1.5' }, /limit must be a whole number/],
    [{ offset: '-1' }, /offset must be between/],
    [{ minPrice: '-1' }, /minPrice must be a non-negative number/],
    [{ maxPrice: '1e3' }, /maxPrice must be a non-negative number/],
    [{ beds: 'three' }, /beds must be a whole number/],
    [{ baths: 'x' }, /baths must be a non-negative number/],
    [{ zipcode: '9260' }, /zipcode must be a 5-digit/],
    [{ zipcode: "92602' OR 1=1" }, /zipcode must be a 5-digit/],
    [{ minPrice: '500000', maxPrice: '100000' }, /minPrice cannot be greater than maxPrice/],
    [{ city: ['Irvine', 'Tustin'] }, /city must be a single value/],
    [{ sort: 'price; DROP TABLE x' }, /sort must be one of/],
    [{ category: 'lease' }, /category must be one of/],
  ];
  for (const [q, re] of cases) {
    const { errors } = parseQuery(q);
    assert.ok(errors.some((e) => re.test(e)), `${JSON.stringify(q)} -> ${errors}`);
  }
});

test('collects every error, not just the first', () => {
  assert.equal(parseQuery({ limit: '0', minPrice: 'abc', beds: 'x' }).errors.length, 3);
});

test('valid values are parsed to numbers; zero is a real value', () => {
  const { errors, params } = parseQuery({ minPrice: '300000', beds: '0', baths: '2.5', zipcode: '92602', limit: '10', offset: '20' });
  assert.deepEqual(errors, []);
  assert.equal(params.filters.minPrice, 300000);
  assert.equal(params.filters.beds, 0);
  assert.equal(params.filters.baths, 2.5);
  assert.equal(params.limit, 10);
  assert.equal(params.offset, 20);
});

test('empty strings are treated as not provided', () => {
  const { errors, params } = parseQuery({ beds: '', city: '  ', minPrice: '' });
  assert.deepEqual(errors, []);
  assert.equal(params.filters.beds, undefined);
  assert.equal(params.filters.city, undefined);
});

test('legacy page param maps to offset; explicit offset wins', () => {
  assert.equal(parseQuery({ page: '3', limit: '10' }).params.offset, 20);
  assert.equal(parseQuery({ page: '3', limit: '10', offset: '5' }).params.offset, 5);
});

// ---- query building ------------------------------------------------------
test('city filter normalises both sides and is parameterised', () => {
  const { where, args } = buildWhere({ city: 'IRVINE ' });
  assert.match(where, /LOWER\(TRIM\(L_City\)\) = LOWER\(TRIM\(\?\)\)/);
  assert.deepEqual(args, ['IRVINE ']);
});

test('user input never appears in the SQL text (injection safety)', () => {
  const evil = "x' OR '1'='1";
  const { where, args } = buildWhere({ city: evil, type: evil, q: evil });
  assert.ok(!where.includes('OR \'1\''));
  assert.ok(args.includes(evil));
});

test('every filter subset: #placeholders === #args, values in the same order', () => {
  const all = { city: 'Irvine', zipcode: '92602', minPrice: 300000, maxPrice: 900000, beds: 3, baths: 2 };
  const keys = Object.keys(all);
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const f = {};
    keys.forEach((k, i) => { if (mask & (1 << i)) f[k] = all[k]; });
    const { where, args } = buildWhere(f);
    assert.equal(placeholders(where), args.length, `mask ${mask}`);
    // args must follow the order the conditions were added
    const expected = keys.filter((k) => k in f).map((k) => f[k]);
    assert.deepEqual(args, expected, `mask ${mask}`);
  }
});

// ---- debug challenge: minPrice + beds ------------------------------------
test('DEBUG CHALLENGE: minPrice + beds -> price and beds bind to the right placeholders', () => {
  const { where, args } = buildWhere({ minPrice: 300000, beds: 3 });
  assert.equal(where, "L_Status = 'Active' AND L_SystemPrice >= ? AND L_Keyword2 >= ?");
  assert.deepEqual(args, [300000, 3]); // a swapped/missing value here is the bug
});

test('DEBUG CHALLENGE: COUNT and SELECT use identical filter values', async () => {
  const pool = fakePool({ total: 87 });
  const res = fakeRes();
  await listProperties(pool)({ query: { city: 'Irvine', minPrice: '300000', beds: '3', limit: '20', offset: '0' } }, res);
  assert.equal(res.statusCode, 200);
  const [count, select] = pool.calls;
  assert.deepEqual(count.args, ['Irvine', 300000, 3]);
  assert.deepEqual(select.args, ['Irvine', 300000, 3, 20, 0]);
  assert.equal(placeholders(count.sql), count.args.length);
  assert.equal(placeholders(select.sql), select.args.length);
});

// ---- handler -------------------------------------------------------------
test('response matches the API contract', async () => {
  const pool = fakePool({ total: 87, rows: [{ id: 'a', photos: '["p1","p2"]', type: 'SingleFamilyResidence' }] });
  const res = fakeRes();
  await listProperties(pool)({ query: { limit: '10', offset: '20' } }, res);
  assert.equal(res.body.total, 87);
  assert.equal(res.body.limit, 10);
  assert.equal(res.body.offset, 20);
  assert.ok(Array.isArray(res.body.results));
  assert.deepEqual(res.body.results[0].photos, ['p1']);
  // pagination args: LIMIT 10 OFFSET 20 -> rows 21-30
  assert.deepEqual(pool.calls[1].args.slice(-2), [10, 20]);
});

test('invalid input returns 400 and never touches the database', async () => {
  for (const query of [{ minPrice: 'abc' }, { limit: '0' }, { limit: '200' }]) {
    const pool = fakePool();
    const res = fakeRes();
    await listProperties(pool)({ query }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Invalid query parameters');
    assert.ok(res.body.details.length > 0);
    assert.equal(pool.calls.length, 0);
  }
});

test('database failure returns 500 JSON, not a crash', async () => {
  const res = fakeRes();
  const origError = console.error; console.error = () => {};
  try { await listProperties(fakePool({ fail: true }))({ query: {} }, res); } finally { console.error = origError; }
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Server error' });
});
