"""Load ownership history and permit history for accounts in our target ZIPs."""

import duckdb

DATA_DIR = "/Users/ricky.dsa/Downloads/HousingData"

CSV_OPTS = "delim='\\t', quote='', ignore_errors=true, null_padding=true, all_varchar=true"


def load(con: duckdb.DuckDBPyConnection):
    own_path = f"{DATA_DIR}/ownership_history.txt"
    permits_path = f"{DATA_DIR}/Real_acct_owner/permits.txt"

    sql = f"""
    CREATE OR REPLACE TABLE ownership_history AS
    SELECT
        TRIM(o.acct) AS acct,
        TRY_CAST(NULLIF(TRIM(o.purchase_date), '') AS DATE) AS purchase_date,
        TRIM(o.name) AS owner_name,
        TRIM(o.site_address) AS site_address
    FROM read_csv_auto('{own_path}', {CSV_OPTS}) o
    WHERE TRIM(o.acct) IN (SELECT acct FROM hcad_accounts)
    ORDER BY acct, purchase_date DESC
    """
    con.execute(sql)
    count = con.execute("SELECT COUNT(*) FROM ownership_history").fetchone()[0]
    print(f"  ownership_history: {count} rows")

    sql2 = f"""
    CREATE OR REPLACE TABLE permits AS
    SELECT
        TRIM(p.acct) AS acct,
        TRIM(p.status) AS status,
        TRIM(p.dscr) AS description,
        TRIM(p.permit_type) AS permit_type,
        TRIM(p.permit_tp_descr) AS permit_type_desc,
        TRY_CAST(NULLIF(TRIM(p.issue_date), '') AS DATE) AS issue_date,
        TRY_CAST(NULLIF(TRIM(p.yr), '') AS INTEGER) AS yr
    FROM read_csv_auto('{permits_path}', {CSV_OPTS}) p
    WHERE TRIM(p.acct) IN (SELECT acct FROM hcad_accounts)
    ORDER BY acct, issue_date DESC
    """
    con.execute(sql2)
    count2 = con.execute("SELECT COUNT(*) FROM permits").fetchone()[0]
    print(f"  permits: {count2} rows")


if __name__ == "__main__":
    con = duckdb.connect("housing.duckdb")
    load(con)
