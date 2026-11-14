"""Load Redfin monthly market data for target ZIPs into redfin_market table.

Source is Redfin's public Data Center zip-code market tracker (a national feed,
rolling 3-month windows stepped monthly). Override with the REDFIN_SOURCE env var
to point at a local file instead (e.g. for offline development).

Fail-soft (Nov 2026): Redfin closed the public ``redfin-public-data`` S3 bucket
(403 on every tracker file) and replaced it with an interactive Download Hub
that exposes no direct file URLs, so the feed can no longer be fetched by a
scheduled job. When the fetch fails but a previous ``redfin_market`` table
exists, the load warns and keeps the previous data instead of failing the
whole monthly refresh. A fresh database with no previous table still fails hard.
"""

import os

import duckdb

ZIPS = ("77007", "77008", "77009")

DEFAULT_SOURCE = (
    "https://redfin-public-data.s3-us-west-2.amazonaws.com/"
    "redfin_market_tracker/zip_code_market_tracker.tsv000.gz"
)

REGIONS = tuple(f"Zip Code: {z}" for z in ZIPS)


def _table_exists(con: duckdb.DuckDBPyConnection, name: str) -> bool:
    return (
        con.execute(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
            [name],
        ).fetchone()[0]
        > 0
    )


def load(con: duckdb.DuckDBPyConnection) -> int:
    path = os.environ.get("REDFIN_SOURCE", DEFAULT_SOURCE)

    sql = f"""
    CREATE OR REPLACE TEMP TABLE _redfin_new AS
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
        -- Redfin omits MONTHS_OF_SUPPLY for small ZIPs; derive from active/sold
        -- (window is 90 days so homes_sold is a 3-month total, not monthly)
        COALESCE(
            TRY_CAST(MONTHS_OF_SUPPLY AS DOUBLE),
            CASE WHEN TRY_CAST(HOMES_SOLD AS DOUBLE) > 0
                 THEN ROUND(TRY_CAST(INVENTORY AS DOUBLE) * 3.0 / TRY_CAST(HOMES_SOLD AS DOUBLE), 2)
            END
        ) AS months_of_supply,
        TRY_CAST(OFF_MARKET_IN_TWO_WEEKS AS DOUBLE) * 100 AS pct_off_market_2wk
    FROM read_csv_auto('{path}', delim='\t')
    WHERE REGION_TYPE = 'zip code'
      AND PROPERTY_TYPE = 'All Residential'
      AND REGION IN {REGIONS}
    ORDER BY zip_code, period_begin
    """
    try:
        con.execute(sql)
        count = con.execute("SELECT COUNT(*) FROM _redfin_new").fetchone()[0]
        if count == 0:
            raise ValueError("Redfin load returned 0 rows")
    except Exception as e:  # one dead upstream must not kill the refresh
        if not _table_exists(con, "redfin_market"):
            raise
        previous = con.execute("SELECT COUNT(*) FROM redfin_market").fetchone()[0]
        print(
            "  WARNING: Redfin refresh failed "
            f"({type(e).__name__}: {str(e)[:200]}); "
            f"keeping previous redfin_market data ({previous} rows)"
        )
        return previous
    con.execute(
        "CREATE OR REPLACE TABLE redfin_market AS SELECT * FROM _redfin_new "
        "ORDER BY zip_code, period_begin"
    )
    count = con.execute("SELECT COUNT(*) FROM redfin_market").fetchone()[0]
    print(f"  redfin_market: {count} rows")
    return count


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
