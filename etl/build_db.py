"""Build housing.duckdb from local raw data files, filtered to ZIPs 77007/77008/77009."""

import duckdb

import load_har
import load_zhvi
import load_redfin
import load_hcad
import load_ownership_permits

DB_PATH = "housing.duckdb"


def main():
    con = duckdb.connect(DB_PATH)

    print("Loading MLS listings (HAR)...")
    load_har.load(con)

    print("Loading Zillow ZHVI...")
    load_zhvi.load(con)

    print("Loading Redfin market data...")
    load_redfin.load(con)

    print("Loading HCAD accounts + buildings...")
    load_hcad.load(con)

    print("Loading ownership history + permits...")
    load_ownership_permits.load(con)

    print("\nDone. Tables:")
    for (name,) in con.execute("SHOW TABLES").fetchall():
        cnt = con.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
        print(f"  {name}: {cnt} rows")

    con.close()


if __name__ == "__main__":
    main()
