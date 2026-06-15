"""Refresh ZHVI + Redfin market data and re-export static site data.

Re-runs the ZHVI and Redfin loaders against their public data feeds (no MLS/HCAD
data is touched), then regenerates the static export (market trends, FRED macro
snapshot, and per-property valuations, since ZHVI feeds the comp time-adjustment).

Intended to run on a schedule via GitHub Actions:
    python etl/refresh_market_data.py
"""

import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import load_redfin  # noqa: E402
import load_zhvi  # noqa: E402
import export_static  # noqa: E402

DB_PATH = ROOT / "etl" / "housing.duckdb"


def main() -> None:
    con = duckdb.connect(str(DB_PATH))

    print("Refreshing Zillow ZHVI...")
    load_zhvi.load(con)

    print("Refreshing Redfin market data...")
    load_redfin.load(con)

    con.close()

    print("Re-exporting static site data...")
    export_static.main()

    print("Done.")


if __name__ == "__main__":
    main()
