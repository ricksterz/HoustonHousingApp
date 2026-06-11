"""Comps-based market value range estimator.

Method: recent 'Sold' MLS listings in the subject's ZIP within a sqft band
(preferring a similar year-built when enough comps exist), each comp's $/sqft
time-adjusted to the latest month via the ZIP's ZHVI index. The subject's range
is the 25th/50th/75th percentile of adjusted $/sqft times the subject's sqft.

DuckDB-specific syntax (ASOF JOIN, quantile_cont) is isolated in this module.
"""

COMP_WINDOW_MONTHS = 30
SQFT_BAND = 0.25  # comps within ±25% of subject sqft
YEAR_BAND = 25  # preferred: comps built within ±25 years of subject
MIN_YEAR_BAND_COMPS = 8  # apply the year band only when it leaves this many comps

_SQL = """
WITH latest AS (
    SELECT zip_code, MAX(month) AS max_month FROM zhvi_trend GROUP BY 1
),
zhvi_now AS (
    SELECT z.zip_code, l.max_month, z.zhvi AS zhvi_now
    FROM zhvi_trend z
    JOIN latest l ON z.zip_code = l.zip_code AND z.month = l.max_month
),
comps AS (
    SELECT
        l.zip_code,
        l.building_sqft AS sqft,
        l.year_built,
        n.max_month,
        l.close_price / NULLIF(l.building_sqft, 0) * (n.zhvi_now / z.zhvi) AS adj_ppsf
    FROM mls_listings l
    ASOF JOIN zhvi_trend z
        ON l.zip_code = z.zip_code AND z.month <= date_trunc('month', l.close_date)
    JOIN zhvi_now n ON n.zip_code = l.zip_code
    WHERE l.status = 'Sold'
      AND l.close_date IS NOT NULL
      AND l.close_date >= current_date - INTERVAL {window} MONTH
      AND l.close_price >= 50000
      AND l.building_sqft >= 300
),
subjects AS (
    SELECT acct, zip_code,
           TRY_CAST(building_area AS DOUBLE) AS sqft,
           TRY_CAST(year_improved AS INTEGER) AS yr
    FROM hcad_accounts
    WHERE TRY_CAST(building_area AS DOUBLE) >= 300
      {acct_filter}
)
SELECT
    s.acct,
    ANY_VALUE(s.sqft) AS sqft,
    ANY_VALUE(c.max_month) AS zhvi_as_of,
    COUNT(*) AS comp_count,
    quantile_cont(c.adj_ppsf, 0.25) AS p25,
    quantile_cont(c.adj_ppsf, 0.50) AS p50,
    quantile_cont(c.adj_ppsf, 0.75) AS p75,
    COUNT(*) FILTER (
        WHERE s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS yr_comp_count,
    quantile_cont(c.adj_ppsf, 0.25) FILTER (
        WHERE s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS yr_p25,
    quantile_cont(c.adj_ppsf, 0.50) FILTER (
        WHERE s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS yr_p50,
    quantile_cont(c.adj_ppsf, 0.75) FILTER (
        WHERE s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS yr_p75
FROM subjects s
JOIN comps c
  ON c.zip_code = s.zip_code
 AND c.sqft BETWEEN s.sqft * {band_lo} AND s.sqft * {band_hi}
GROUP BY s.acct
"""


def _sql(acct_filter: str) -> str:
    return _SQL.format(
        window=COMP_WINDOW_MONTHS,
        year_band=YEAR_BAND,
        band_lo=1 - SQFT_BAND,
        band_hi=1 + SQFT_BAND,
        acct_filter=acct_filter,
    )


def _build_valuation(row):
    (_, sqft, zhvi_as_of, comp_count, p25, p50, p75, yr_count, yr_p25, yr_p50, yr_p75) = row
    if yr_count and yr_count >= MIN_YEAR_BAND_COMPS:
        count, q25, q50, q75, year_band = yr_count, yr_p25, yr_p50, yr_p75, True
    else:
        count, q25, q50, q75, year_band = comp_count, p25, p50, p75, False
    if not count or q50 is None or not sqft:
        return None
    return {
        "method": "ZHVI-adjusted MLS comps",
        "window_months": COMP_WINDOW_MONTHS,
        "sqft_band_pct": int(SQFT_BAND * 100),
        "year_band_applied": year_band,
        "sqft_used": round(sqft),
        "comp_count": count,
        "ppsf_low": round(q25),
        "ppsf_mid": round(q50),
        "ppsf_high": round(q75),
        "est_low": round(q25 * sqft),
        "est_mid": round(q50 * sqft),
        "est_high": round(q75 * sqft),
        "zhvi_as_of": zhvi_as_of.isoformat() if zhvi_as_of else None,
    }


def estimate_for_account(con, acct: str):
    rows = con.execute(_sql("AND acct = ?"), [acct]).fetchall()
    return _build_valuation(rows[0]) if rows else None


def estimate_all(con) -> dict:
    """Bulk estimates for the static export: {acct: valuation_dict}."""
    out = {}
    for row in con.execute(_sql("")).fetchall():
        val = _build_valuation(row)
        if val:
            out[row[0]] = val
    return out
