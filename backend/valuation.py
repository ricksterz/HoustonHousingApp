"""Comps-based market value range estimator.

Method: recent 'Sold' MLS listings in the subject's ZIP within a sqft band,
preferring comps with a similar lot size (small-lot townhomes price very
differently per sqft than large-lot single-family homes) and, within that, a
similar year-built when enough comps remain. Each comp's $/sqft is
time-adjusted to the latest quarter via a segment price index (townhome vs
single-family, per ZIP) built from the MLS data itself — ZIP-wide indexes
like ZHVI mask segment divergence (e.g. Heights townhomes fell ~12% from
late 2024 to mid 2026 while single-family rose ~7%). The subject's range is
the 25th/50th/75th percentile of adjusted $/sqft times the subject's sqft.

Brand-new construction (sold within 2 years of being built) is excluded from
both the comp pool and the index: it commands a premium over existing
inventory and is a different product (warranties, fresh finishes, builder
incentives).

DuckDB-specific syntax (quantile_cont, window frames) is isolated here.
"""

COMP_WINDOW_MONTHS = 12
SQFT_BAND = 0.25  # comps within ±25% of subject sqft; wider band ensures
                  # enough lot-band comps for rare/large home sizes
LOT_BAND = 0.4  # preferred: comps with lot size within ±40% of subject's lot
MIN_LOT_BAND_COMPS = 5  # apply the lot band when at least this many comps qualify
YEAR_BAND = 25  # preferred: comps built within ±25 years of subject
MIN_YEAR_BAND_COMPS = 5  # apply the year band when at least this many comps qualify

SEGMENT_LOT_SQFT = 3000  # lots under this are 'townhome', at/over are 'single-family'
INDEX_WINDOW_MONTHS = 30  # history used to build the segment price index
NEW_CONSTRUCTION_MIN_AGE = 3  # exclude comps sold younger than this (years)

_SQL = """
WITH sold AS (
    SELECT
        zip_code,
        CASE WHEN lot_size_sqft > 0 AND lot_size_sqft < {seg_lot} THEN 'th' ELSE 'sf' END AS seg,
        date_trunc('quarter', close_date) AS qtr,
        close_date,
        close_price / NULLIF(building_sqft, 0) AS ppsf,
        building_sqft AS sqft,
        lot_size_sqft AS lot_sqft,
        year_built
    FROM mls_listings
    WHERE status = 'Sold'
      AND close_date IS NOT NULL
      AND close_date >= current_date - INTERVAL {idx_window} MONTH
      AND close_price >= 50000
      AND building_sqft >= 300
      AND (year_built IS NULL OR year(close_date) - year_built >= {min_age})
),
seg_idx AS (
    -- quarterly median $/sqft per ZIP x segment, smoothed over 2 quarters
    SELECT zip_code, seg, qtr,
           avg(med) OVER (
               PARTITION BY zip_code, seg ORDER BY qtr
               ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
           ) AS idx
    FROM (
        SELECT zip_code, seg, qtr, median(ppsf) AS med
        FROM sold GROUP BY 1, 2, 3
    )
),
latest_idx AS (
    SELECT zip_code, seg, qtr AS as_of, idx AS idx_now
    FROM (
        SELECT *, row_number() OVER (PARTITION BY zip_code, seg ORDER BY qtr DESC) AS rn
        FROM seg_idx
    )
    WHERE rn = 1
),
comps AS (
    SELECT
        s.zip_code,
        s.sqft,
        s.lot_sqft,
        s.year_built,
        li.as_of AS max_month,
        s.ppsf * (li.idx_now / si.idx) AS adj_ppsf
    FROM sold s
    JOIN seg_idx si ON si.zip_code = s.zip_code AND si.seg = s.seg AND si.qtr = s.qtr
    JOIN latest_idx li ON li.zip_code = s.zip_code AND li.seg = s.seg
    WHERE s.close_date >= current_date - INTERVAL {window} MONTH
),
subjects AS (
    SELECT acct, zip_code,
           TRY_CAST(building_area AS DOUBLE) AS sqft,
           TRY_CAST(land_area AS DOUBLE) AS lot_sqft,
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
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
    ) AS lot_comp_count,
    quantile_cont(c.adj_ppsf, 0.25) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
    ) AS lot_p25,
    quantile_cont(c.adj_ppsf, 0.50) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
    ) AS lot_p50,
    quantile_cont(c.adj_ppsf, 0.75) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
    ) AS lot_p75,
    COUNT(*) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
          AND s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS lot_yr_comp_count,
    quantile_cont(c.adj_ppsf, 0.25) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
          AND s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS lot_yr_p25,
    quantile_cont(c.adj_ppsf, 0.50) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
          AND s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS lot_yr_p50,
    quantile_cont(c.adj_ppsf, 0.75) FILTER (
        WHERE s.lot_sqft > 0 AND c.lot_sqft > 0
          AND c.lot_sqft BETWEEN s.lot_sqft * {lot_band_lo} AND s.lot_sqft * {lot_band_hi}
          AND s.yr IS NOT NULL AND c.year_built IS NOT NULL AND ABS(c.year_built - s.yr) <= {year_band}
    ) AS lot_yr_p75,
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
        idx_window=INDEX_WINDOW_MONTHS,
        seg_lot=SEGMENT_LOT_SQFT,
        min_age=NEW_CONSTRUCTION_MIN_AGE,
        year_band=YEAR_BAND,
        band_lo=1 - SQFT_BAND,
        band_hi=1 + SQFT_BAND,
        lot_band_lo=1 - LOT_BAND,
        lot_band_hi=1 + LOT_BAND,
        acct_filter=acct_filter,
    )


def _build_valuation(row):
    (
        _,
        sqft,
        index_as_of,
        comp_count,
        p25,
        p50,
        p75,
        lot_count,
        lot_p25,
        lot_p50,
        lot_p75,
        lot_yr_count,
        lot_yr_p25,
        lot_yr_p50,
        lot_yr_p75,
        yr_count,
        yr_p25,
        yr_p50,
        yr_p75,
    ) = row
    if lot_yr_count and lot_yr_count >= MIN_LOT_BAND_COMPS:
        count, q25, q50, q75 = lot_yr_count, lot_yr_p25, lot_yr_p50, lot_yr_p75
        lot_band, year_band = True, True
    elif lot_count and lot_count >= MIN_LOT_BAND_COMPS:
        count, q25, q50, q75 = lot_count, lot_p25, lot_p50, lot_p75
        lot_band, year_band = True, False
    elif yr_count and yr_count >= MIN_YEAR_BAND_COMPS:
        count, q25, q50, q75 = yr_count, yr_p25, yr_p50, yr_p75
        lot_band, year_band = False, True
    else:
        count, q25, q50, q75 = comp_count, p25, p50, p75
        lot_band, year_band = False, False
    if not count or q50 is None or not sqft:
        return None
    spread_pct = round((q75 - q25) / q50 * 100) if q50 else None
    # confidence: high <20%, medium 20-35%, low >35%
    confidence = "high" if spread_pct < 20 else ("medium" if spread_pct < 35 else "low")
    return {
        "method": "segment-adjusted MLS comps",
        "window_months": COMP_WINDOW_MONTHS,
        "sqft_band_pct": int(SQFT_BAND * 100),
        "lot_band_applied": lot_band,
        "year_band_applied": year_band,
        "sqft_used": round(sqft),
        "comp_count": count,
        "ppsf_low": round(q25),
        "ppsf_mid": round(q50),
        "ppsf_high": round(q75),
        "est_low": round(q25 * sqft),
        "est_mid": round(q50 * sqft),
        "est_high": round(q75 * sqft),
        "spread_pct": spread_pct,
        "confidence": confidence,
        "index_as_of": index_as_of.isoformat() if index_as_of else None,
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
