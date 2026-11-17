'use strict';
// Week 9 tests: sortBy/sortOrder (Option 1) and the request-timing logger.
// Pure: uses fake pools and fake responses, so no database and no MySQL driver are needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseQuery, buildOrderBy, buildWhere, SORT_COLUMNS, LISTED_DATE_COLUMN,
} = require('../lib/propertyQuery');
const { listProperties } = require('../lib/handlers');
const { requestLogger } = require('../lib/requestLogger');

const placeholders = (sql) => (sql.match(/\?/g) || []).length;

function fakeRes() {
  return {
    statusCode: 200, body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function fakePool({ total = 87, rows = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args });
      return /COUNT\(\*\)/.test(sql) ? [[{ total }]] : [rows];
    },
  };
}

const run = async (query, pool = fakePool()) => {
  const res = fakeRes();
  await listProperties(pool)({ query }, res);
  return { res, pool };
};
const listSql = (pool) => pool.calls.find((c) => /ORDER BY/.test(c.sql));

// ---- whitelist -------------------------------------------------------------
test('whitelist is the actual rets_property column names (price, date, sqft, beds)', () => {
  assert.deepEqual(
    Object.keys(SORT_COLUMNS).sort(),
    ['L_Keyword2', 'LM_Int2_3', 'L_SystemPrice', LISTED_DATE_COLUMN].sort(),
  );
});

test('every whitelisted column is accepted', () => {
  for (const sortBy of Object.keys(SORT_COLUMNS)) {
    const { errors, params } = parseQuery({ sortBy });
    assert.deepEqual(errors, [], sortBy);
    assert.equal(params.sortBy, sortBy);
  }
});

test('RESO names, wrong casing, injection and non-strings are rejected', () => {
  const bad = [
    'ListPrice', 'LivingArea', 'BedroomsTotal', 'L_ListingDate', 'OnMarketDate', 'price', 'newest',
    'l_systemprice', 'L_SystemPrice ', 'L_SystemPrice; DROP TABLE rets_property',
    'L_SystemPrice, SLEEP(5)', '(SELECT 1)', 'constructor', '__proto__', 'toString',
  ];
  for (const sortBy of bad) {
    const { errors } = parseQuery({ sortBy });
    // 'L_SystemPrice ' with trailing space is trimmed by the parser, so it is the one valid case.
    if (sortBy === 'L_SystemPrice ') { assert.deepEqual(errors, []); continue; }
    assert.ok(errors.some((e) => /sortBy must be one of/.test(e)), `${JSON.stringify(sortBy)} -> ${errors}`);
  }
  assert.ok(parseQuery({ sortBy: ['L_SystemPrice', 'L_Keyword2'] }).errors.some((e) => /sortBy must be a single value/.test(e)));
});

test('sortOrder: asc/desc in any casing, default asc, anything else rejected', () => {
  assert.equal(parseQuery({ sortBy: 'L_SystemPrice' }).params.sortOrder, 'asc');
  assert.equal(parseQuery({ sortBy: 'L_SystemPrice', sortOrder: 'DESC' }).params.sortOrder, 'desc');
  assert.equal(parseQuery({ sortBy: 'L_SystemPrice', sortOrder: 'Asc' }).params.sortOrder, 'asc');
  for (const sortOrder of ['up', 'descending', '1', 'asc; DROP TABLE x', ['asc', 'desc']]) {
    assert.ok(parseQuery({ sortBy: 'L_SystemPrice', sortOrder }).errors.length > 0, JSON.stringify(sortOrder));
  }
  assert.ok(parseQuery({ sortOrder: 'sideways' }).errors.some((e) => /sortOrder must be one of/.test(e)));
});

test('empty sortBy / sortOrder are treated as not provided', () => {
  const { errors, params } = parseQuery({ sortBy: '', sortOrder: '' });
  assert.deepEqual(errors, []);
  assert.equal(params.sortBy, undefined);
  assert.equal(params.sortOrder, 'asc');
});

// ---- ORDER BY text ---------------------------------------------------------
test('price low-to-high and high-to-low produce opposite ORDER BY clauses on L_SystemPrice', () => {
  const asc = buildOrderBy({ sortBy: 'L_SystemPrice', sortOrder: 'asc' });
  const desc = buildOrderBy({ sortBy: 'L_SystemPrice', sortOrder: 'desc' });
  assert.match(asc, /L_SystemPrice ASC, L_ListingID ASC$/);
  assert.match(desc, /L_SystemPrice DESC, L_ListingID DESC$/);
});

test('date listed sorts on the date column', () => {
  assert.match(buildOrderBy({ sortBy: LISTED_DATE_COLUMN, sortOrder: 'desc' }), new RegExp(`${LISTED_DATE_COLUMN} DESC, L_ListingID DESC$`));
});

test('missing values sort last in both directions (price/sqft also treat 0 as missing)', () => {
  for (const sortOrder of ['asc', 'desc']) {
    assert.match(buildOrderBy({ sortBy: 'L_SystemPrice', sortOrder }), /^\(L_SystemPrice IS NULL OR L_SystemPrice = 0\) ASC, /);
    assert.match(buildOrderBy({ sortBy: 'LM_Int2_3', sortOrder }), /^\(LM_Int2_3 IS NULL OR LM_Int2_3 = 0\) ASC, /);
    assert.match(buildOrderBy({ sortBy: 'L_Keyword2', sortOrder }), /^\(L_Keyword2 IS NULL\) ASC, /);
  }
});

test('legacy ?sort= still works and sortBy overrides it', () => {
  assert.equal(buildOrderBy({ sort: 'price_asc' }), 'L_SystemPrice ASC, L_ListingID ASC');
  assert.equal(buildOrderBy({}), 'L_ListingID DESC');
  assert.match(buildOrderBy({ sort: 'price_asc', sortBy: 'L_Keyword2', sortOrder: 'desc' }), /L_Keyword2 DESC/);
});

test('buildOrderBy refuses anything not on the whitelist, even if validation was skipped', () => {
  for (const sortBy of ['ListPrice', 'L_SystemPrice; DROP TABLE x', 'constructor', null]) {
    assert.throws(() => buildOrderBy({ sortBy }), /not allowed/, String(sortBy));
  }
});

// ---- handler: 400s and SQL -------------------------------------------------
test('invalid sortBy -> 400 listing the allowed columns, and the database is never queried', async () => {
  const { res, pool } = await run({ sortBy: 'ListPrice' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Invalid query parameters');
  assert.ok(res.body.details.some((d) => d.includes('L_SystemPrice')));
  assert.equal(pool.calls.length, 0);
});

test('invalid sortOrder -> 400', async () => {
  const { res, pool } = await run({ sortBy: 'L_SystemPrice', sortOrder: 'sideways' });
  assert.equal(res.statusCode, 400);
  assert.equal(pool.calls.length, 0);
});

test('valid sort reaches the list query as an ORDER BY, never as a bound value', async () => {
  const { res, pool } = await run({ sortBy: 'L_SystemPrice', sortOrder: 'desc', city: 'Irvine', limit: '20', offset: '20' });
  assert.equal(res.statusCode, 200);
  const { sql, args } = listSql(pool);
  assert.match(sql, /ORDER BY \(L_SystemPrice IS NULL OR L_SystemPrice = 0\) ASC, L_SystemPrice DESC, L_ListingID DESC LIMIT \? OFFSET \?/);
  assert.equal(placeholders(sql), args.length);
  assert.ok(!args.includes('L_SystemPrice') && !args.includes('desc'));
});

test('the COUNT query is unaffected by sorting, so total matches the filtered set', async () => {
  const { res, pool } = await run({ sortBy: 'L_Keyword2', sortOrder: 'asc', beds: '3' }, fakePool({ total: 42 }));
  const count = pool.calls.find((c) => /COUNT\(\*\)/.test(c.sql));
  assert.ok(!/ORDER BY/.test(count.sql));
  assert.equal(res.body.total, 42);
});

test('sort is the same on every page: only OFFSET changes between page 1 and page 3', async () => {
  const orderOf = async (offset) => {
    const { pool } = await run({ sortBy: 'LM_Int2_3', sortOrder: 'desc', offset: String(offset) });
    const { sql, args } = listSql(pool);
    return { order: sql.match(/ORDER BY .*? LIMIT/)[0], offset: args.at(-1) };
  };
  const p1 = await orderOf(0); const p3 = await orderOf(40);
  assert.equal(p1.order, p3.order);
  assert.deepEqual([p1.offset, p3.offset], [0, 40]);
});

test('sorting composes with filters: same WHERE with or without sort', async () => {
  const filters = { city: 'Irvine', minPrice: '300000', beds: '3' };
  const plain = await run(filters);
  const sorted = await run({ ...filters, sortBy: 'L_SystemPrice' });
  const whereOf = (pool) => listSql(pool).sql.match(/WHERE (.*?) ORDER BY/)[1];
  assert.equal(whereOf(plain.pool), whereOf(sorted.pool));
  assert.equal(whereOf(sorted.pool), buildWhere({ city: 'Irvine', minPrice: 300000, beds: 3 }).where);
});

test('legacy sort=price_asc requests keep working unchanged', async () => {
  const { res, pool } = await run({ sort: 'price_asc' });
  assert.equal(res.statusCode, 200);
  assert.match(listSql(pool).sql, /ORDER BY L_SystemPrice ASC, L_ListingID ASC LIMIT/);
});

// ---- request logger --------------------------------------------------------
function loggedRequest({ slowMs, waitMs = 0 }) {
  const lines = []; const handlers = {}; const headers = {};
  const res = {
    statusCode: 200, headersSent: false, writableFinished: true,
    on(ev, fn) { handlers[ev] = fn; },
    setHeader(k, v) { headers[k] = v; },
    writeHead() { this.headersSent = true; return this; },
  };
  requestLogger((l) => lines.push(l), { slowMs })({ method: 'GET', originalUrl: '/api/properties' }, res, () => {});
  const end = () => { res.writeHead(200); handlers.finish(); };
  if (waitMs) { const t = Date.now() + waitMs; while (Date.now() < t); }
  end();
  return { lines, headers };
}

test('log line ends with the duration in ms, and the same value is sent as X-Response-Time', () => {
  const { lines, headers } = loggedRequest({ slowMs: 10_000 });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[\d{4}-\d\d-\d\dT[\d:.]+Z\] GET \/api\/properties 200 \d+\.\dms$/);
  assert.match(headers['X-Response-Time'], /^\d+\.\dms$/);
});

test('requests slower than the threshold are marked SLOW; fast ones are not', () => {
  assert.match(loggedRequest({ slowMs: 20, waitMs: 40 }).lines[0], /ms SLOW$/);
  assert.doesNotMatch(loggedRequest({ slowMs: 10_000 }).lines[0], /SLOW/);
});
