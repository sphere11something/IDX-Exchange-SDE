-- Run this file BEFORE week3_indexes.sql and again AFTER; paste both outputs into docs/week3-explain.md.
-- Look at: type (ALL = full scan), key (NULL = no index used), rows (estimated rows examined).
-- Optional: EXPLAIN ANALYZE (MySQL 8.0.18+) also reports actual time.

-- 1. city only
EXPLAIN SELECT COUNT(*) FROM rets_property
WHERE L_Status = 'Active' AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine'));

-- 2. city + price + beds (the example from the API contract)
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active' AND LOWER(TRIM(L_City)) = LOWER(TRIM('Irvine'))
  AND L_SystemPrice >= 300000 AND L_Keyword2 >= 3
ORDER BY L_SystemPrice ASC, L_ListingID ASC LIMIT 20 OFFSET 0;

-- 3. zipcode
EXPLAIN SELECT COUNT(*) FROM rets_property
WHERE L_Status = 'Active' AND L_Zip = '92602';

-- 4. price range
EXPLAIN SELECT L_ListingID FROM rets_property
WHERE L_Status = 'Active' AND L_SystemPrice BETWEEN 500000 AND 900000
ORDER BY L_SystemPrice ASC, L_ListingID ASC LIMIT 20;

-- 5. beds + baths
EXPLAIN SELECT COUNT(*) FROM rets_property
WHERE L_Status = 'Active' AND L_Keyword2 >= 3 AND LM_Dec_3 >= 2;
