-- Week 3: indexes for GET /api/properties filters.
-- Run:  docker exec -i idx-mysql-local mysql -uroot -p<password> rets < backend/sql/week3_indexes.sql
--
-- Every query has L_Status = 'Active', so it leads each index (equality column first),
-- followed by the filter column, then price (range / sort column last).
--
-- BEFORE running: DESCRIBE rets_property; and check the column types.
--   * If L_City / L_Zip / L_Keyword2 are TEXT/BLOB, MySQL needs a prefix length,
--     e.g. L_Zip(5). VARCHAR needs none.
--   * The city index is a FUNCTIONAL index (MySQL 8.0.13+; the README uses mysql:8).
--     It only helps when the query uses exactly LOWER(TRIM(L_City)), which buildWhere() does.

-- city filter (case/space-insensitive) + price
CREATE INDEX idx_rets_property_status_city_price
  ON rets_property (L_Status, (LOWER(TRIM(L_City))), L_SystemPrice);

-- zipcode filter + price
CREATE INDEX idx_rets_property_status_zip_price
  ON rets_property (L_Status, L_Zip, L_SystemPrice);

-- price-only filters / sorts
CREATE INDEX idx_rets_property_status_price
  ON rets_property (L_Status, L_SystemPrice);

-- beds / baths filters
CREATE INDEX idx_rets_property_status_beds_baths
  ON rets_property (L_Status, L_Keyword2, LM_Dec_3);

SHOW INDEXES FROM rets_property;
