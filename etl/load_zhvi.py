"""Load Zillow ZHVI (home value index) for target ZIPs into zhvi_trend table (long format)."""

import duckdb

DATA_DIR = "/Users/ricky.dsa/Downloads/HousingData"
ZIPS = ("77007", "77008", "77009")


def load(con: duckdb.DuckDBPyConnection):
    path = f"{DATA_DIR}/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

    sql = f"""
    CREATE OR REPLACE TABLE zhvi_trend AS
    SELECT
        RegionName AS zip_code,
        CAST(month AS DATE) AS month,
        value AS zhvi
    FROM (
        SELECT * FROM read_csv_auto('{path}')
        WHERE RegionType = 'zip' AND RegionName IN {ZIPS}
    )
    UNPIVOT (value FOR month IN (COLUMNS('^\\d{{4}}-\\d{{2}}-\\d{{2}}$')))
    WHERE value IS NOT NULL
    ORDER BY zip_code, month
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM zhvi_trend").fetchone()[0]
    print(f"  zhvi_trend: {count} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
