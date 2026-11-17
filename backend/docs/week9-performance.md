# Week 9 Part B: performance notes

Part A (sorting) is described in the main README. This file covers EXPLAIN, indexes, request timing, the
error boundary and console warnings.

## 52. Reading EXPLAIN

`EXPLAIN <query>` shows the plan MySQL *would* use without running it. `EXPLAIN ANALYZE` (8.0.18+) runs the
query and adds measured times. Columns, in the order MySQL prints them:

| Column | Meaning | What to look for |
|--------|---------|------------------|
| `id` | Which SELECT in the statement this row belongs to. Subqueries get their own id. | Rows with the same id are joined together; a higher id is a nested subquery. |
| `select_type` | Kind of SELECT: `SIMPLE`, `PRIMARY`, `SUBQUERY`, `DEPENDENT SUBQUERY`, `DERIVED`, `UNION`. | `DEPENDENT SUBQUERY` runs **once per outer row**. Our `nextOpen` column is one, so it executes for every listing returned (20 per page). |
| `table` | The table (or alias) this row describes. | |
| `partitions` | Partitions that would be read. | `NULL` for non-partitioned tables like ours. |
| `type` | **How** rows are found (the access method). Best to worst: `system`, `const`, `eq_ref`, `ref`, `range`, `index`, `ALL`. | `ALL` = full table scan (reads every row). `index` = full index scan. `ref` / `range` = real index lookups. |
| `possible_keys` | Indexes MySQL could use. | `NULL` means no usable index exists. |
| `key` | The index it actually chose. | `NULL` = no index used. Compare with `possible_keys`: a candidate that is not chosen usually means the optimiser thinks a scan is cheaper. |
| `key_len` | Bytes of the chosen index that are used. | On a composite index this shows **how many leading columns** are used. A short `key_len` means only the first column(s) helped. |
| `ref` | What is compared against the index: `const` (a literal) or a column from another table. | |
| `rows` | **Estimated** rows examined, not rows returned. | The main number to watch before/after indexing. It is a statistic, so it can be off. |
| `filtered` | Estimated % of examined rows that survive the rest of the WHERE. | `rows x filtered / 100` is the estimate handed to the next step. A low % means a lot of work is thrown away. |
| `Extra` | Extra notes. | See below. |

Common `Extra` values:
- `Using where` - rows are read, then filtered by conditions the index could not check.
- `Using index` - covering index: answered from the index alone, without touching table rows (good).
- `Using index condition` - index condition pushdown: the index is used to discard rows early.
- `Using filesort` - an extra sorting step because the index order does not match `ORDER BY`. Despite the name it is often in memory; it only hurts when many rows must be sorted.
- `Using temporary` - an internal temp table (GROUP BY / DISTINCT); usually a red flag.

### Our most complex query
`GET /api/properties?category=sale&city=Irvine&minPrice=300000&beds=3&baths=2&sortBy=L_SystemPrice&sortOrder=asc`
combines six `WHERE` conditions, a computed `ORDER BY`, `LIMIT/OFFSET`, and the per-row `nextOpen` subquery.
It is query 1 in `sql/week9_explain.sql`, with the matching `COUNT(*)` as query 2.

How to expect it to read before indexing: `type = ALL` or a partial `ref` on the Week 3 city/price index, a large `rows`,
`Extra` showing `Using where; Using filesort`, and `DEPENDENT SUBQUERY` on `rets_openhouse` with `type = ALL` if that table
has no index on `L_ListingID`. **Those are predictions, not measurements** - fill in the tables below from your own run.

### Why the sort clause shows `Using filesort`
`ORDER BY (L_SystemPrice IS NULL OR L_SystemPrice = 0) ASC, L_SystemPrice ASC, ...` is an expression, so no index
can deliver rows in that order and MySQL has to sort everything that passes the WHERE, then keep 20. That is the price of
putting unknown prices (NULL / 0) last instead of at the top of "low to high". With a narrow filter (city, ZIP) it is cheap;
for an unfiltered sort over every Active listing it is the slowest case, so measure it (queries 4-5). If it is too slow,
the options are (a) drop the `IS NULL` prefix so the index order is used, accepting that unknowns come first, or
(b) add an indexed generated column that already puts unknowns last.

## 53. Indexes added (`sql/week9_indexes.sql`)

Run order: `week3_indexes.sql` (already in the repo), then `week9_explain.sql` (before), then `week9_indexes.sql`, then
`week9_explain.sql` again (after).

| Index | Serves | Column order reasoning |
|-------|--------|------------------------|
| `idx_rets_property_status_type_price (L_Status, L_Type_, L_SystemPrice)` | `category=rent/sale`, `type=` filters, price sort within them | Equality columns first, price last. |
| `idx_rets_property_status_city_beds (L_Status, LOWER(TRIM(L_City)), L_Keyword2)` | "3 bed in Irvine", the most common two-filter combo | Functional index on the same expression `buildWhere()` uses, otherwise it cannot be matched. |
| `idx_rets_property_status_sqft (L_Status, LM_Int2_3)` | `sortBy=LM_Int2_3` | |
| `idx_rets_property_status_listed (L_Status, L_ListingDate)` | `sortBy=L_ListingDate` | Confirm the column name first (`week9_explain.sql` step 0a). |
| `idx_rets_openhouse_listing_date (L_ListingID, OpenHouseDate)` | The `nextOpen` subquery, once per listing on every page | Skip if `rets_openhouse` already has an index leading with `L_ListingID`. |

Sorting by beds reuses the Week 3 `idx_rets_property_status_beds_baths` (leading columns `L_Status, L_Keyword2`).
Indexes are not free: each one costs disk and slows writes. After measuring, drop any that the optimiser never picks.

### Results (fill in from your run)

`rows` is the estimate from `EXPLAIN`; `time` is the `actual time` from `EXPLAIN ANALYZE` (or the `ms` in the API log line).

| # | Query | Before: type / key / rows / time | After: type / key / rows / time |
|---|-------|----------------------------------|---------------------------------|
| 1 | Complex filter + price sort (page 1) | | |
| 2 | Matching `COUNT(*)` | | |
| 3 | city + beds, sort by beds | | |
| 4 | Sort by square feet, no filters | | |
| 5 | Sort by date listed, no filters | | |
| 6 | Rentals sorted by price | | |
| 7 | `nextOpen` subquery for one listing | | |

End-to-end check: start the API, call the same URL a few times before and after, and compare the `ms` at the end of the log lines
(or the `X-Response-Time` response header).

## 54. Request logging with response time
`lib/requestLogger.js` already printed a duration; Week 9 tightens it:

```
[2026-11-17T22:41:07.512Z] GET /api/properties?city=Irvine&sortBy=L_SystemPrice&sortOrder=asc 200 38.4ms
[2026-11-17T22:41:09.031Z] GET /api/properties?sortBy=LM_Int2_3&sortOrder=desc 200 812.9ms SLOW
```
- Duration is measured with `process.hrtime` from the moment the request arrives until the response is finished, in ms with one decimal.
- Requests at or over `SLOW_REQUEST_MS` (default 500) get a trailing `SLOW` so `grep SLOW` finds them.
- The same value is sent back as an `X-Response-Time` header, so you can read it in the browser's Network tab.
- Tests: `test/week9.test.js` (line format, header, SLOW marker).

## 55. React Error Boundary
`frontend/src/components/ErrorBoundary.jsx`, mounted in `App.jsx` around all routes.
- If any component throws **while rendering**, the boundary shows "Something went wrong" with **Try again**, **Reload page**, **Back to home** and the error message in a collapsible block, instead of a blank screen.
- It resets by itself when the path changes (`resetKey={pathname}`), so a broken page does not trap the user.
- The error is also logged with `console.error`.
- It does **not** catch errors in event handlers or async code (`fetch().then(...)`); those still need `try/catch` / `.catch()`. That is a React limitation, not a gap in this component.
- Tests: `components/ErrorBoundary.test.jsx` (children render, fallback appears, Try again recovers, still-broken case, resetKey on/off).

## 56. Console warnings
Done as a **static review** (no browser/dev server was available when this was written):
- Fixed: `MapView` called `fetch(...).then(...)` with no `.catch`, which logs "Uncaught (in promise)" whenever the API is down or returns non-JSON. It now ignores the failure (the listing column already shows its own error) and checks the payload is an array.
- Checked and clean: list items have stable `key`s, controlled inputs always receive defined values (`SearchPage` initialises every filter to `''`), no effect forgets its cleanup, and the new components export only components (the `react/only-export-components` lint rule is on).
- To confirm on your machine: `cd frontend && npm run lint && npm test`, then open the app with DevTools open and click through `/`, `/for-sale`, `/rent`, `/listings`, and a property page. Anything still printed in the console is the remaining work for this checkpoint item.
