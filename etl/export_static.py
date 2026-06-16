"""Export API responses as static JSON files for GitHub Pages hosting.

Bulk-exports every HCAD account in the database (one JSON file per property,
matching the /api/property/lookup response shape) plus market trends, the FRED
macro snapshot, and an address index for client-side search.

Run from the project root with the venv active:
    python etl/export_static.py
"""

import json
import re
import sys
from bisect import bisect_left
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.db import get_connection  # noqa: E402
from backend.fred_client import get_macro_snapshot  # noqa: E402
from backend.routers.market import VALID_ZIPS, _zip_trend  # noqa: E402
from backend.valuation import estimate_all  # noqa: E402

OUT_DIR = ROOT / "frontend" / "public" / "data"

# Owner names come from public HCAD records, but redact them by default since
# the GitHub Pages site is publicly accessible. Set to False to include them.
REDACT_OWNER_NAMES = True

MAX_PERMITS_PER_PROPERTY = 10


_SUFFIX_MAP = {
    r"\bST\b": "STREET",
    r"\bDR\b": "DRIVE",
    r"\bLN\b": "LANE",
    r"\bAVE\b": "AVENUE",
    r"\bBLVD\b": "BOULEVARD",
    r"\bRD\b": "ROAD",
    r"\bPL\b": "PLACE",
    r"\bCT\b": "COURT",
    r"\bFWY\b": "FREEWAY",
}


def expand_suffix(addr: str) -> str:
    """Expand HCAD street suffix abbreviations to full words (e.g. ST→STREET).

    Applied to both HCAD site addresses and MLS addresses so they match.
    """
    for pattern, replacement in _SUFFIX_MAP.items():
        addr = re.sub(pattern, replacement, addr)
    return addr


def slugify(address: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", address.strip().lower()).strip("-")


def write_json(path: Path, data, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        path.write_text(json.dumps(data, separators=(",", ":")))
    else:
        path.write_text(json.dumps(data, indent=1))


def fetch_dicts(con, sql: str) -> list[dict]:
    """Run a query and return rows as dicts with dates serialized to ISO strings
    and null values dropped (the frontend treats missing keys as '—')."""
    rows = con.execute(sql).fetchall()
    cols = [c[0] for c in con.description]
    out = []
    for row in rows:
        rec = {}
        for k, v in zip(cols, row):
            if v is None:
                continue
            rec[k] = v.isoformat() if hasattr(v, "isoformat") else v
        out.append(rec)
    return out


def group_by(records: list[dict], key: str) -> dict:
    grouped = defaultdict(list)
    for rec in records:
        grouped[rec[key]].append(rec)
    return grouped


def export_market(con) -> None:
    print("Exporting market trends...")
    compare = {"zips": {}}
    for zip_code in VALID_ZIPS:
        series = _zip_trend(con, zip_code)
        write_json(OUT_DIR / f"trend_{zip_code}.json", {"zip": zip_code, "series": series})
        compare["zips"][zip_code] = series
    write_json(OUT_DIR / "compare.json", compare)

    print("Exporting FRED macro snapshot...")
    write_json(OUT_DIR / "macro.json", get_macro_snapshot())


def export_properties(con) -> int:
    print("Loading tables for bulk property export...")
    accounts = fetch_dicts(con, "SELECT * FROM hcad_accounts ORDER BY acct")

    buildings_by_acct = group_by(
        fetch_dicts(con, "SELECT * FROM hcad_buildings ORDER BY acct, bld_num"), "acct"
    )

    permits_by_acct = group_by(
        fetch_dicts(
            con,
            f"""
            SELECT * EXCLUDE (rn) FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY acct ORDER BY issue_date DESC) AS rn
                FROM permits
            ) WHERE rn <= {MAX_PERMITS_PER_PROPERTY}
            """,
        ),
        "acct",
    )

    ownership_by_acct = (
        {}
        if REDACT_OWNER_NAMES
        else group_by(
            fetch_dicts(con, "SELECT * FROM ownership_history ORDER BY acct, purchase_date DESC"),
            "acct",
        )
    )

    # MLS listings keyed by normalized street address, plus a sorted key list so
    # prefix matches (unit numbers etc.) mirror the backend's LIKE 'addr%' logic.
    listings = fetch_dicts(
        con,
        """
        SELECT mls_number, status, property_type, list_price, close_price, list_date,
               close_date, dom, cdom, bedrooms, baths_full, baths_half, building_sqft, year_built,
               UPPER(REGEXP_REPLACE(street_address, '\\s+', ' ', 'g')) AS addr_norm
        FROM mls_listings
        ORDER BY COALESCE(close_date, list_date) DESC
        """,
    )
    for l in listings:
        if l.get("addr_norm"):
            l["addr_norm"] = expand_suffix(l["addr_norm"])
    listings_by_addr = group_by([l for l in listings if l.get("addr_norm")], "addr_norm")
    sorted_addrs = sorted(listings_by_addr)

    def listings_for(site_norm: str) -> list[dict]:
        matched = []
        i = bisect_left(sorted_addrs, site_norm)
        while i < len(sorted_addrs) and sorted_addrs[i].startswith(site_norm):
            matched.extend(listings_by_addr[sorted_addrs[i]])
            i += 1
        return [{k: v for k, v in l.items() if k != "addr_norm"} for l in matched]

    print("Computing valuation estimates...")
    valuations = estimate_all(con)
    print(f"  estimated {len(valuations)} properties")

    print(f"Writing {len(accounts)} property files...")
    prop_dir = OUT_DIR / "property"
    prop_dir.mkdir(parents=True, exist_ok=True)
    seen_slugs = set()
    exported_addresses = []
    skipped = 0

    for account in accounts:
        site_norm = expand_suffix(account.get("site_address_norm", "").strip())
        account["site_address_norm"] = site_norm  # display full suffix in JSON
        slug = slugify(site_norm) if site_norm else ""
        if not slug or slug in seen_slugs:
            skipped += 1
            continue
        seen_slugs.add(slug)

        if REDACT_OWNER_NAMES:
            account.pop("owner_name", None)

        acct = account["acct"]
        payload = {
            "hcad": account,
            "buildings": buildings_by_acct.get(acct, []),
            "ownership_history": ownership_by_acct.get(acct, []),
            "permits": permits_by_acct.get(acct, []),
            "mls_listings": listings_for(site_norm),
            "valuation": valuations.get(acct),
        }
        write_json(prop_dir / f"{slug}.json", payload, compact=True)
        exported_addresses.append(site_norm)

    print(f"  wrote {len(exported_addresses)} properties ({skipped} skipped: blank/duplicate address)")

    exported_addresses.sort()
    write_json(OUT_DIR / "addresses.json", exported_addresses, compact=True)
    print(f"  wrote addresses.json ({len(exported_addresses)} entries)")
    return len(exported_addresses)


def main() -> None:
    con = get_connection()
    export_market(con)
    count = export_properties(con)
    write_json(
        OUT_DIR / "meta.json",
        {
            "generated": datetime.now(timezone.utc).isoformat(),
            "property_count": count,
            "owner_names_redacted": REDACT_OWNER_NAMES,
        },
    )
    print("Done.")


if __name__ == "__main__":
    main()
