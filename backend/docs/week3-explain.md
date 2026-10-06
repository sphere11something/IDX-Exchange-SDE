# Week 3: Indexing and EXPLAIN notes

## How to measure
1. `docker start idx-mysql-local`
2. Run **before** state: `docker exec -i idx-mysql-local mysql -uroot -p rets < backend/sql/week3_explain.sql`
3. Create the indexes: `docker exec -i idx-mysql-local mysql -uroot -p rets < backend/sql/week3_indexes.sql`
4. Run the same EXPLAIN file again and compare.

Fill in the table with your own output (columns: `type`, `key`, `rows`).

| # | Query | Before: type / key / rows | After: type / key / rows |
|---|-------|---------------------------|--------------------------|
| 1 | city only | | |
| 2 | city + price + beds | | |
| 3 | zipcode | | |
| 4 | price range | | |
| 5 | beds + baths | | |

Expected: `type` goes from `ALL` (full table scan) to `ref`/`range`, `key` goes from `NULL` to the new index, and `rows` drops sharply.

## Why each index looks the way it does
- **`L_Status` first.** Every query filters `L_Status = 'Active'`, an equality, so it leads each index.
- **City uses a functional index on `LOWER(TRIM(L_City))`.** The data has inconsistent casing, so the query compares `LOWER(TRIM(col)) = LOWER(TRIM(?))`. A plain index on `L_City` cannot be used once the column is wrapped in functions; the index has to be built on the same expression.
- **Price is the last column.** Equality columns go first, range/sort columns last; a range on a middle column stops later columns from being used for lookups.
- **Composite city+price** serves `?city=...&minPrice=...` in one index instead of two separate ones.

## Query-building logic (walkthrough)
1. `parseQuery` validates every param and returns all errors at once (400 + `details`).
2. `buildWhere` pushes each condition and its value into two arrays in lock-step and joins conditions with `AND`.
3. `COUNT(*)` and the page query share the same `where` + `args`, so `total` always matches the filtered set.
4. Sorting is looked up in a whitelist (`SORTS`) because `ORDER BY` can't be parameterised; a price tie-breaker on `L_ListingID` keeps pages stable.

## Debug challenge
Symptom: result count wrong when `minPrice` and `beds` are combined. Cause class: the `values` array no longer lines up with the `?` placeholders (a value skipped, duplicated or pushed out of order, or a `COUNT` query given different args than the data query).
Guard tests: `test/properties.test.js` -> "DEBUG CHALLENGE" tests, plus an exhaustive test over all 64 filter combinations that checks `#placeholders === #args` and ordering.

## Why SQL injection is dangerous / how parameterised queries stop it
If input is concatenated into SQL (`"... WHERE city = '" + city + "'"`), an attacker can send `x' OR '1'='1` or `'; DROP TABLE ...` and change the query's *structure*: read other data, modify or delete it. With `?` placeholders the SQL text is sent to the server separately from the values, so the values are always treated as data, never parsed as SQL. Here only `SORTS[sort]` is interpolated, and it is picked from a fixed whitelist.
