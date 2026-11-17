-- Week 9 Part B: composite indexes added after reading the EXPLAIN output in week9_explain.sql.
-- Run AFTER backend/sql/week3_indexes.sql (that file already covers city+price, zip+price,
-- price, and beds+baths). These cover what the Week 9 sort and the rent/sale split still scan for.
--   docker exec -i idx-mysql-local mysql -uroot -p<password> rets < backend/sql/week9_indexes.sql
--
-- MySQL has no CREATE INDEX IF NOT EXISTS: re-running errors with "Duplicate key name". To redo one:
--   DROP INDEX <name> ON <table>;
-- Rule used for column order: equality columns first (L_Status, then the filter), then the
-- range/sort column last. A range condition stops later columns from being used for lookup.
-- If L_Type_ is TEXT/BLOB MySQL needs a prefix length, e.g. L_Type_(50); VARCHAR needs none.

-- category=rent / category=sale / type=... : equality or IN on L_Type_, then price for the sort.
CREATE INDEX idx_rets_property_status_type_price
  ON rets_property (L_Status, L_Type_, L_SystemPrice);

-- "3 bed in Irvine" : the most common two-filter shape. Same functional expression as buildWhere().
CREATE INDEX idx_rets_property_status_city_beds
  ON rets_property (L_Status, (LOWER(TRIM(L_City))), L_Keyword2);

-- sortBy=LM_Int2_3 (square feet)
CREATE INDEX idx_rets_property_status_sqft
  ON rets_property (L_Status, LM_Int2_3);

-- sortBy=L_ListingDate (date listed). Change the column if week9_explain.sql step 0a shows another name.
CREATE INDEX idx_rets_property_status_listed
  ON rets_property (L_Status, L_ListingDate);

-- nextOpen subquery runs once per returned listing, filtering rets_openhouse by listing id + date.
-- Skip this one if SHOW INDEXES FROM rets_openhouse already shows an index leading with L_ListingID.
CREATE INDEX idx_rets_openhouse_listing_date
  ON rets_openhouse (L_ListingID, OpenHouseDate);

SHOW INDEXES FROM rets_property;
SHOW INDEXES FROM rets_openhouse;
