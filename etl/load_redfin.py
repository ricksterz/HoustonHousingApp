"""Load Redfin monthly market data for target ZIPs into redfin_market table.

Source is Redfin's public Data Center zip-code market tracker (a national feed,
rolling 3-month windows stepped monthly). Override with the REDFIN_SOURCE env var
to point at a local file instead (e.g. for offline development).
"""

import os

import duckdb

ZIPS = ("77007", "77008", "77009")

DEFAULT_SOURCE = (
    "https://redfin-public-data.s3-us-west-2.amazonaws.com/"
    "redfin_market_tracker/zip_code_market_tracker.tsv000.gz"
)

REGIONS = tuple(f"Zip Code: {z}" for z in ZIPS)


def load(con: duckdb.DuckDBPyConnection):
    path = os.environ.get("REDFIN_SOURCE", DEFAULT_SOURCE)

    sql = f"""
    CREATE OR REPLACE TABLE redfin_market AS
    SELECT
        PERIOD_BEGIN AS period_begin,
        PERIOD_END AS period_end,
        regexp_extract(REGION, '\\d{{5}}', 0) AS zip_code,
        'monthly' AS frequency,
        TRY_CAST(HOMES_SOLD AS DOUBLE) AS homes_sold,
        TRY_CAST(MEDIAN_SALE_PRICE AS DOUBLE) AS median_sale_price,
        TRY_CAST(MEDIAN_DOM AS DOUBLE) AS median_dom,
        TRY_CAST(AVG_SALE_TO_LIST AS DOUBLE) * 100 AS sale_to_list_ratio,
        TRY_CAST(SOLD_ABOVE_LIST AS DOUBLE) * 100 AS pct_sold_above_list,
        TRY_CAST(NEW_LISTINGS AS DOUBLE) AS new_listings,
        TRY_CAST(INVENTORY AS DOUBLE) AS active_listings,
        TRY_CAST(PENDING_SALES AS DOUBLE) AS pending_sales,
        TRY_CAST(MEDIAN_LIST_PRICE AS DOUBLE) AS median_new_listing_price,
        TRY_CAST(MEDIAN_PPSF AS DOUBLE) AS median_sale_price_psf,
        TRY_CAST(MONTHS_OF_SUPPLY AS DOUBLE) AS months_of_supply,
        TRY_CAST(OFF_MARKET_IN_TWO_WEEKS AS DOUBLE) * 100 AS pct_off_market_2wk
    FROM read_csv_auto('{path}', delim='\t')
    WHERE REGION_TYPE = 'zip code'
      AND PROPERTY_TYPE = 'All Residential'
      AND REGION IN {REGIONS}
    ORDER BY zip_code, period_begin
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM redfin_market").fetchone()[0]
    print(f"  redfin_market: {count} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
