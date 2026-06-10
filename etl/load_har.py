"""Load HAR MLS listing CSVs (per-ZIP, SF + TC) into mls_listings table."""

import duckdb

DATA_DIR = "/Users/ricky.dsa/Downloads/HousingData"

FILES = [
    ("HAR_77007_SF_2021-2026.csv", "SF"),
    ("HAR_77007_TC_2021-2026.csv", "TC"),
    ("HAR_77008_SF_2021-2026.csv", "SF"),
    ("HAR_77008_TC_2021-2026.csv", "TC"),
    ("HAR_77009_SF_2021-2026.csv", "SF"),
    ("HAR_77009_TC_2021-2026.csv", "TC"),
]


def load(con: duckdb.DuckDBPyConnection):
    union_parts = []
    for fname, ptype in FILES:
        path = f"{DATA_DIR}/{fname}"
        union_parts.append(
            f"SELECT *, '{fname}' AS source_file, '{ptype}' AS file_property_type "
            f"FROM read_csv_auto('{path}', ALL_VARCHAR=TRUE)"
        )
    union_sql = "\nUNION ALL BY NAME\n".join(union_parts)

    sql = f"""
    CREATE OR REPLACE TABLE mls_listings AS
    WITH raw AS (
        {union_sql}
    ),
    dedup AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY "MLS Number"
                ORDER BY TRY_STRPTIME("Last Change Timestamp", '%m/%d/%Y %I:%M:%S %p') DESC
            ) AS rn
        FROM raw
    )
    SELECT
        "MLS Number" AS mls_number,
        "Property Type" AS property_type,
        file_property_type,
        "Status" AS status,
        TRIM(CONCAT_WS(' ',
            NULLIF(TRIM("Street Number"), ''),
            NULLIF(TRIM("Street Dir Prefix"), ''),
            NULLIF(TRIM("Street Name"), ''),
            NULLIF(TRIM("Street Suffix"), ''),
            NULLIF(TRIM("Street Dir Suffix"), ''),
            NULLIF(TRIM("Unit Number"), '')
        )) AS street_address,
        SUBSTR("Zip Code", 1, 5) AS zip_code,
        TRY_CAST(REPLACE(REPLACE("List Price", '$', ''), ',', '') AS DOUBLE) AS list_price,
        TRY_CAST(REPLACE(REPLACE("Close Price", '$', ''), ',', '') AS DOUBLE) AS close_price,
        CAST(TRY_STRPTIME("Close Date", '%m/%d/%Y %I:%M:%S %p') AS DATE) AS close_date,
        TRY_CAST("Building SqFt" AS DOUBLE) AS building_sqft,
        TRY_CAST(REPLACE("Price Sq Ft List", '$', '') AS DOUBLE) AS price_sqft_list,
        TRY_CAST(REPLACE("Price Sq Ft Sold", '$', '') AS DOUBLE) AS price_sqft_sold,
        TRY_CAST("Lot Size" AS DOUBLE) AS lot_size_sqft,
        TRY_CAST("Acres" AS DOUBLE) AS acres,
        TRY_CAST("Year Built" AS INTEGER) AS year_built,
        TRY_CAST("Bedrooms" AS INTEGER) AS bedrooms,
        TRY_CAST("Baths Full" AS INTEGER) AS baths_full,
        TRY_CAST("Baths Half" AS INTEGER) AS baths_half,
        TRY_CAST("Baths Total" AS DOUBLE) AS baths_total,
        TRY_CAST("Stories" AS INTEGER) AS stories,
        CASE WHEN "Pool Private" = 'Yes' THEN TRUE
             WHEN "Pool Private" = 'No' THEN FALSE
             ELSE NULL END AS pool_private,
        TRY_CAST("No Of Garage Cap" AS INTEGER) AS garage_cap,
        "Style" AS style,
        TRY_CAST("DOM" AS INTEGER) AS dom,
        TRY_CAST("CDOM" AS INTEGER) AS cdom,
        "Subdivision" AS subdivision,
        "Market Area" AS market_area,
        "School District" AS school_district,
        "School Elementary" AS school_elementary,
        "School Middle" AS school_middle,
        "School High" AS school_high,
        "List Office Name" AS list_office_name,
        "List Agent Full Name" AS list_agent_name,
        "Selling Office Name" AS selling_office_name,
        "Selling Agent Full Name" AS selling_agent_name,
        TRY_STRPTIME("Last Change Timestamp", '%m/%d/%Y %I:%M:%S %p') AS last_change_ts,
        CAST(TRY_STRPTIME("List Date", '%m/%d/%Y %I:%M:%S %p') AS DATE) AS list_date,
        source_file
    FROM dedup
    WHERE rn = 1
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM mls_listings").fetchone()[0]
    print(f"  mls_listings: {count} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
