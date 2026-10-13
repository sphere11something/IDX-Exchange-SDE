# Week 4: Property detail and open house endpoints

## Endpoints
| Endpoint | Success | Errors |
|----------|---------|--------|
| `GET /api/properties/:id` | 200, full property object (with upcoming `openHouses`) | 400 bad ID, 404 unknown ID, 500 DB error |
| `GET /api/properties/:id/openhouses` | 200, array of `rets_openhouse` rows (`[]` is fine) | 400 bad ID, 404 unknown property, 500 DB error |

- **ID validation** (`parseListingId` in `lib/propertyQuery.js`): 1-20 characters, letters/digits/`-`/`_` only. Anything else is a 400 before the database is touched.
- **Open houses** check that the property exists first (404 vs. an existing property with no events returning `[]`), then query `rets_openhouse` by `L_ListingID` ordered by `OpenHouseDate, OH_StartTime`. `all_data` is returned as-is.
- **Request logging** (`lib/requestLogger.js`): one line per request, printed when the response finishes: `[timestamp] METHOD URL STATUS 12.3ms`.

## Why route order matters in Express
Express checks routes top to bottom and the first match wins; it does not look for the "best" match. `/:id` is a wildcard that matches any single path segment, so if it is registered before `/:id/openhouses` or `/map`, a request such as `/map` is handed to the detail handler with `id = "map"`. (In Express 4, `:id` could even swallow more than one segment, giving `id = "abc123/openhouses"`.) Specific routes go first, wildcards last, which is how `routes/properties.js` is ordered.

## Debug challenge: unhandled rejection for one listing ID
**Status: not reproduced.** I did not have access to the database in this session and was asked not to run code, so the special ID below is *not* identified. What is in place:

- Every handler has `try/catch`, there is a global Express error handler returning JSON 500, and `process.on('unhandledRejection')` logs instead of crashing silently.
- `all_data` parsing no longer assumes a type (string vs. already-parsed object vs. `NULL` vs. malformed).

Most likely causes to check, since the crash is tied to a single listing:
1. **Malformed or NULL `all_data`** for that listing. The old code called `JSON.parse(all_data)` on it. A `try/catch` existed there, but a `NULL` column or an already-parsed object behaves differently.
2. **NULL/odd date or time values** (`OpenHouseDate`, `OH_StartTime`) for that listing.
3. **An unusually large number of open house rows** for that listing.

To find it, run against the real data:
```sql
SELECT L_ListingID, COUNT(*) n,
       SUM(all_data IS NULL) null_json,
       SUM(NOT JSON_VALID(all_data)) bad_json,
       SUM(OpenHouseDate IS NULL) null_date
FROM rets_openhouse
GROUP BY L_ListingID
HAVING null_json > 0 OR bad_json > 0 OR null_date > 0
ORDER BY n DESC;
```
Then call `/api/properties/<that id>/openhouses` and read the server log line for the stack trace. Fill in the real cause here once confirmed.
