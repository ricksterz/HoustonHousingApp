"""Load HCAD bulk property records (real_acct.txt + building_res.txt) for target ZIPs."""

import duckdb

DATA_DIR = "/Users/ricky.dsa/Downloads/HousingData"
ZIPS = ("77007", "77008", "77009")

CSV_OPTS = "delim='\\t', quote='', ignore_errors=true, null_padding=true, all_varchar=true"


def load(con: duckdb.DuckDBPyConnection):
    acct_path = f"{DATA_DIR}/Real_acct_owner/real_acct.txt"
    bldg_path = f"{DATA_DIR}/Real_building_land/building_res.txt"

    sql = f"""
    CREATE OR REPLACE TABLE hcad_accounts AS
    SELECT
        TRIM(acct) AS acct,
        TRIM(site_addr_1) AS site_address,
        UPPER(TRIM(REGEXP_REPLACE(site_addr_1, '\\s+', ' ', 'g'))) AS site_address_norm,
        TRIM(site_addr_3) AS zip_code,
        TRIM(mailto) AS owner_name,
        TRIM(state_class) AS state_class,
        TRIM(school_dist) AS school_dist,
        TRIM(Neighborhood_Code) AS neighborhood_code,
        TRIM(Neighborhood_Grp) AS neighborhood_grp,
        TRIM(Market_Area_1) AS market_area_1,
        TRIM(Market_Area_1_Dscr) AS market_area_1_dscr,
        TRY_CAST(NULLIF(TRIM(yr_impr), '') AS INTEGER) AS year_improved,
        TRY_CAST(NULLIF(TRIM(bld_ar), '') AS DOUBLE) AS building_area,
        TRY_CAST(NULLIF(TRIM(land_ar), '') AS DOUBLE) AS land_area,
        TRY_CAST(NULLIF(TRIM(acreage), '') AS DOUBLE) AS acreage,
        TRY_CAST(NULLIF(TRIM(land_val), '') AS DOUBLE) AS land_val,
        TRY_CAST(NULLIF(TRIM(bld_val), '') AS DOUBLE) AS bld_val,
        TRY_CAST(NULLIF(TRIM(x_features_val), '') AS DOUBLE) AS x_features_val,
        TRY_CAST(NULLIF(TRIM(assessed_val), '') AS DOUBLE) AS assessed_val,
        TRY_CAST(NULLIF(TRIM(tot_appr_val), '') AS DOUBLE) AS tot_appr_val,
        TRY_CAST(NULLIF(TRIM(tot_mkt_val), '') AS DOUBLE) AS tot_mkt_val,
        TRY_CAST(NULLIF(TRIM(new_construction_val), '') AS DOUBLE) AS new_construction_val,
        TRY_CAST(NULLIF(TRIM(new_own_dt), '') AS DATE) AS last_sale_date,
        TRIM(protested) AS protested,
        TRIM(CONCAT_WS(' ',
            NULLIF(TRIM(lgl_1), ''), NULLIF(TRIM(lgl_2), ''),
            NULLIF(TRIM(lgl_3), ''), NULLIF(TRIM(lgl_4), '')
        )) AS legal_description
    FROM read_csv_auto('{acct_path}', {CSV_OPTS})
    WHERE TRIM(site_addr_3) IN {ZIPS}
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM hcad_accounts").fetchone()[0]
    print(f"  hcad_accounts: {count} rows")

    sql2 = f"""
    CREATE OR REPLACE TABLE hcad_buildings AS
    SELECT
        TRIM(b.acct) AS acct,
        TRY_CAST(NULLIF(TRIM(b.bld_num), '') AS INTEGER) AS bld_num,
        TRIM(b.property_use_cd) AS property_use_cd,
        TRIM(b.structure_dscr) AS structure_desc,
        TRY_CAST(NULLIF(TRIM(b.date_erected), '') AS INTEGER) AS year_built,
        TRY_CAST(NULLIF(TRIM(b.eff), '') AS INTEGER) AS effective_year,
        NULLIF(TRY_CAST(NULLIF(TRIM(b.yr_remodel), '') AS INTEGER), 0) AS year_remodeled,
        TRY_CAST(NULLIF(TRIM(b.im_sq_ft), '') AS DOUBLE) AS im_sq_ft,
        TRY_CAST(NULLIF(TRIM(b.act_ar), '') AS DOUBLE) AS act_ar,
        TRY_CAST(NULLIF(TRIM(b.gross_ar), '') AS DOUBLE) AS gross_ar,
        TRY_CAST(NULLIF(TRIM(b.base_ar), '') AS DOUBLE) AS base_ar
    FROM read_csv_auto('{bldg_path}', {CSV_OPTS}) b
    WHERE TRIM(b.acct) IN (SELECT acct FROM hcad_accounts)
    """
    con.execute(sql2)
    count2 = con.execute("SELECT COUNT(*) FROM hcad_buildings").fetchone()[0]
    print(f"  hcad_buildings: {count2} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
