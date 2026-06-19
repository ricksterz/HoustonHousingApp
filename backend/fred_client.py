"""FRED API client for Houston macro context, with a simple in-process TTL cache."""

import os
import time
from pathlib import Path

import requests


def _load_dotenv() -> None:
    """Load KEY=VALUE pairs from the project-root .env, without overriding real env vars."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")

FRED_SERIES = {
    "mortgage_rate_30yr": "MORTGAGE30US",
    "houston_hpi": "ATNHPIUS26420Q",
    "houston_median_list_price": "MEDLISPRI26420",
    "houston_active_listings": "ACTLISCOU26420",
    "houston_new_listings": "NEWLISCOU26420",
    "houston_price_reduced": "PRIREDCOU26420",
    "houston_median_dom": "MEDDAYONMAR26420",
    "houston_list_price_sqft": "MEDLISPRIPERSQUFEE26420",
}

CACHE_TTL_SECONDS = 60 * 60  # 1 hour
_cache = {"data": None, "fetched_at": 0}


def _fred_latest(series_id: str) -> dict:
    r = requests.get(
        "https://api.stlouisfed.org/fred/series/observations",
        params={
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "sort_order": "desc",
            "limit": 1,
        },
        timeout=10,
    )
    r.raise_for_status()
    obs = r.json()["observations"][0]
    return {
        "value": float(obs["value"]) if obs["value"] != "." else None,
        "date": obs["date"],
        "series": series_id,
    }


def get_macro_snapshot() -> dict:
    now = time.time()
    if _cache["data"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    result = {}
    if not FRED_API_KEY:
        for key, sid in FRED_SERIES.items():
            result[key] = {"value": None, "date": None, "series": sid, "error": "FRED_API_KEY not set"}
    else:
        for key, sid in FRED_SERIES.items():
            try:
                result[key] = _fred_latest(sid)
            except Exception as e:
                result[key] = {"value": None, "date": None, "series": sid, "error": str(e)}

    _cache["data"] = result
    _cache["fetched_at"] = now
    return result
