-- Week 9 Part B: EXPLAIN the heaviest query the app can generate, before and after indexing.
-- Run BEFORE week9_indexes.sql, save the output, run week9_indexes.sql, run this again, compare.
--   docker exec -i idx-mysql-local mysql -uroot -p<password> rets < backend/sql/week9_explain.sql
-- Paste both outputs into docs/week9-performance.md.

-- 0. Facts the sort feature depends on. Check these first.
--    (a) the date-listed column name (backend LISTED_DATE_COLUMN, frontend utils/sort.js)
SHOW COLUMNS FROM rets_property LIKE '%Date%';
--    (b) sorting by beds is only correct if L_Keyword2 is numeric (a VARCHAR sorts "10" before "2")
SELECT COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rets_property'
  AND COLUMN_NAME IN ('L_SystemPrice', 'L_Keyword2', 'LM_Dec_3', 'LM_Int2_3', 'L_Type_', 'L_City', 'L_Zip');
--    (c) indexes that already exist
SHOW INDEXES FROM rets_property;
SHOW INDEXES FROM rets_openhouse;

-- 1. THE MOST COMPLEX QUERY: for-sale category + city + price + beds + baths, sorted by price,
--    page 1, including the correlated next-open-house subquery. This is exactly what
--    GET /api/properties?category=sale&city=Irvine&minPrice=300000&beds=3&baths=2
--        &sortBy=L_SystemPrice&sortOrder=asc  runs.
EXPLAIN
SELECT L_ListingID id, L_Address address, L_City city, L_State state, L_Zip zip,
  L_SystemPrice price, L_Keyword2 beds, LM_Dec_3 baths, LM_Int2_3 sqft, L_Type_ type,
  (SELECT MIN(CONCAT(o.OpenHouseDate,' ',o.OH_StartTime,'|',o.OH_EndTime)) FROM rets_openhouse o
     WHERE o.L_ListingID = rets_property.L_ListingID AND o.OpenHouseDate >= CURDATE()) nextOpen,
  LMD_MP_Latitude lat, LMD_MP_Longitude lng, YearBuilt yearBuilt, L_Photos photos
FROM rets_property
WHERE L_Status = 'Active'
  AND L_Type_ NOT IN ('ResidentialLease', 'Apartment')
  AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine'))
  AND L_SystemPrice >= 300000
  AND L_Keyword2 >= 3
  AND LM_Dec_3 >= 2
ORDER BY (L_SystemPrice IS NULL OR L_SystemPrice = 0) ASC, L_SystemPrice ASC, L_ListingID ASC
LIMIT 20 OFFSET 0;

-- Same query with real timings (MySQL 8.0.18+): "actual time" and "rows" are measured, not estimated.
EXPLAIN ANALYZE
SELECT L_ListingID, L_SystemPrice FROM rets_property
WHERE L_Status = 'Active'
  AND L_Type_ NOT IN ('ResidentialLease', 'Apartment')
  AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine'))
  AND L_SystemPrice >= 300000 AND L_Keyword2 >= 3 AND LM_Dec_3 >= 2
ORDER BY (L_SystemPrice IS NULL OR L_SystemPrice = 0) ASC, L_SystemPrice ASC, L_ListingID ASC
LIMIT 20 OFFSET 0;

-- 2. The COUNT(*) that runs beside it (same WHERE, no ORDER BY).
EXPLAIN SELECT COUNT(*) FROM rets_property
WHERE L_Status = 'Active'
  AND L_Type_ NOT IN ('ResidentialLease', 'Apartment')
  AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine'))
  AND L_SystemPrice >= 300000 AND L_Keyword2 >= 3 AND LM_Dec_3 >= 2;

-- 3. city + beds (the "3 bedroom house in Irvine" shape), sorted by beds.
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active' AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine')) AND L_Keyword2 >= 3
ORDER BY (L_Keyword2 IS NULL) ASC, L_Keyword2 DESC, L_ListingID DESC
LIMIT 20;

-- 4. Sort by square feet, no filters (first page of "largest first").
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active'
ORDER BY (LM_Int2_3 IS NULL OR LM_Int2_3 = 0) ASC, LM_Int2_3 DESC, L_ListingID DESC
LIMIT 20;

-- 5. Sort by date listed, no filters. If this fails with "Unknown column", fix the column name
--    (see step 0a) in this file, backend/lib/propertyQuery.js and frontend/src/utils/sort.js.
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active'
ORDER BY (ListingContractDate IS NULL) ASC, ListingContractDate DESC, L_ListingID DESC
LIMIT 20;

-- 6. Rentals only (category=rent) sorted by price.
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active' AND L_Type_ IN ('ResidentialLease', 'Apartment')
ORDER BY (L_SystemPrice IS NULL OR L_SystemPrice = 0) ASC, L_SystemPrice ASC, L_ListingID ASC
LIMIT 20;

-- 7. The per-row subquery in the SELECT list: next open house for one listing.
EXPLAIN SELECT MIN(CONCAT(o.OpenHouseDate,' ',o.OH_StartTime,'|',o.OH_EndTime))
FROM rets_openhouse o WHERE o.L_ListingID = 'REPLACE_WITH_A_REAL_ID' AND o.OpenHouseDate >= CURDATE();
