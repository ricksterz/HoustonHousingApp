# Houston Housing Analytics

Market dashboard and property lookup for Houston ZIP codes **77007 / 77008 / 77009**
(Heights / Rice Military / Near Northside), built on local MLS (HAR), Zillow ZHVI,
Redfin, and HCAD bulk data, with live macro context from the FRED API.

## Architecture

- **ETL** (`etl/`) — one-time DuckDB pipeline that filters the raw CSV/TXT downloads
  in `~/Downloads/HousingData/` down to the 3 target ZIPs and loads 7 tables into
  `etl/housing.duckdb` (~4 seconds to rebuild).
- **Backend** (`backend/`) — FastAPI on port 8000. Serves market trends, ZIP
  comparison, property lookup (HCAD + ownership + permits + MLS history), and a
  cached FRED macro snapshot.
- **Frontend** (`frontend/`) — Vite + React + recharts dark-theme dashboard on
  port 5173.

## Setup

```bash
# 1. Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 2. FRED API key (free: https://fred.stlouisfed.org/docs/api/api_key.html)
cp .env.example .env   # then put your key in .env

# 3. Build the database (requires raw data in ~/Downloads/HousingData/)
python etl/build_db.py

# 4. Frontend dependencies
cd frontend && npm install
```

## Run

```bash
# Terminal 1 — backend
source venv/bin/activate
uvicorn backend.main:app --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173.

## API

| Endpoint | Description |
|---|---|
| `GET /api/market/trend?zip=77008` | Monthly combined series (MLS / Redfin / ZHVI) for one ZIP |
| `GET /api/market/compare` | Same series for all 3 ZIPs |
| `GET /api/property/lookup?address=726 E 21ST ST` | HCAD valuation, buildings, ownership, permits, MLS history |
| `GET /api/macro/snapshot` | Live FRED macro stats (1-hour cache) |

## Data sources

| Table | Source | Rows |
|---|---|---|
| `mls_listings` | HAR MLS exports (2021–2026) | ~14.7k |
| `zhvi_trend` | Zillow ZHVI monthly index | ~900 |
| `redfin_market` | Redfin market tracker (2019–2026) | ~250 |
| `hcad_accounts` | HCAD `real_acct.txt` | ~52k |
| `hcad_buildings` | HCAD `building_res.txt` | ~45k |
| `ownership_history` | HCAD `ownership_history.txt` | ~52k |
| `permits` | HCAD `permits.txt` | ~63k |

Note: SQL is kept reasonably portable (DuckDB-specific syntax isolated in the ETL)
so the backend can later be pointed at a Databricks SQL warehouse.
