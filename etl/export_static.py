"""Export API responses as static JSON files for GitHub Pages hosting.

Reuses the backend's query logic directly (no server needed) and writes to
frontend/public/data/, so the Vite build bundles the data into the static site.

Run from the project root with the venv active:
    python etl/export_static.py
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.db import get_connection  # noqa: E402
from backend.fred_client import get_macro_snapshot  # noqa: E402
from backend.routers.market import VALID_ZIPS, _zip_trend  # noqa: E402
from backend.routers.property import property_lookup  # noqa: E402

OUT_DIR = ROOT / "frontend" / "public" / "data"

# Addresses bundled into the static build. Property lookup on the static site
# only works for these — add more and re-run this script to include them.
ADDRESSES = [
    "726 E 21ST ST",
    "2714 HARVARD ST",
]

# Owner names come from public HCAD records, but redact them by default since
# the GitHub Pages site is publicly accessible. Set to False to include them.
REDACT_OWNER_NAMES = True


def slugify(address: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", address.strip().lower()).strip("-")


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1))
    print(f"  wrote {path.relative_to(ROOT)}")


def redact(payload: dict) -> dict:
    if not REDACT_OWNER_NAMES:
        return payload
    payload["hcad"]["owner_name"] = None
    payload["ownership_history"] = []
    return payload


def main() -> None:
    con = get_connection()

    print("Exporting market trends...")
    compare = {"zips": {}}
    for zip_code in VALID_ZIPS:
        series = _zip_trend(con, zip_code)
        write_json(OUT_DIR / f"trend_{zip_code}.json", {"zip": zip_code, "series": series})
        compare["zips"][zip_code] = series
    write_json(OUT_DIR / "compare.json", compare)

    print("Exporting FRED macro snapshot...")
    write_json(OUT_DIR / "macro.json", get_macro_snapshot())

    print("Exporting properties...")
    exported = []
    for address in ADDRESSES:
        try:
            payload = redact(property_lookup(address))
        except Exception as e:
            print(f"  skipped '{address}': {e}")
            continue
        slug = slugify(address)
        write_json(OUT_DIR / "property" / f"{slug}.json", payload)
        exported.append({"address": address, "slug": slug})

    write_json(
        OUT_DIR / "meta.json",
        {
            "generated": datetime.now(timezone.utc).isoformat(),
            "addresses": exported,
            "owner_names_redacted": REDACT_OWNER_NAMES,
        },
    )
    print("Done.")


if __name__ == "__main__":
    main()
