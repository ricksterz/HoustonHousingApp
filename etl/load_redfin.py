"""Load Redfin monthly market data for target ZIPs into redfin_market table."""

import duckdb

DATA_DIR = "/Users/ricky.dsa/Downloads/HousingData"
ZIPS = ("77007", "77008", "77009")


def load(con: duckdb.DuckDBPyConnection):
    path = f"{DATA_DIR}/redfin_housing_market_monthly_all_zips_2019_Jan_to_2026_May.csv"

    sql = f"""
    CREATE OR REPLACE TABLE redfin_market AS
    SELECT
        CAST("PERIOD BEGIN" AS DATE) AS period_begin,
        CAST("PERIOD END" AS DATE) AS period_end,
        "REGION NAME" AS zip_code,
        "FREQUENCY" AS frequency,
        "HOMES SOLD" AS homes_sold,
        "MEDIAN SALE PRICE NSA ($)" AS median_sale_price,
        "MEDIAN DAYS ON MARKET (DAYS)" AS median_dom,
        "AVERAGE SALE TO LIST RATIO (%)" AS sale_to_list_ratio,
        "SHARE SOLD ABOVE ORIGINAL LIST (%)" AS pct_sold_above_list,
        "NEW LISTINGS" AS new_listings,
        "ACTIVE LISTINGS" AS active_listings,
        "PENDING SALES" AS pending_sales,
        "MEDIAN NEW LISTING PRICE ($)" AS median_new_listing_price,
        "MEDIAN SALE PRICE PER SQ.FT. ($)" AS median_sale_price_psf,
        "MONTHS OF SUPPLY" AS months_of_supply,
        "PERCENT OFF MARKET IN TWO WEEKS (%)" AS pct_off_market_2wk
    FROM read_csv_auto('{path}')
    WHERE "REGION TYPE" = 'Zip' AND "REGION NAME" IN {ZIPS}
    ORDER BY zip_code, period_begin
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM redfin_market").fetchone()[0]
    print(f"  redfin_market: {count} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
