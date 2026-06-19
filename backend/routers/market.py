from fastapi import APIRouter, HTTPException

from ..db import get_connection

router = APIRouter(prefix="/api/market", tags=["market"])

VALID_ZIPS = ("77007", "77008", "77009")


def _zip_trend(con, zip_code: str) -> list[dict]:
    rows = con.execute(
        """
        WITH mls_monthly AS (
            SELECT
                date_trunc('month', close_date) AS month,
                MEDIAN(close_price) AS mls_median_close_price,
                MEDIAN(list_price) AS mls_median_list_price,
                MEDIAN(dom) AS mls_median_dom,
                COUNT(*) AS mls_closed_count
            FROM mls_listings
            WHERE zip_code = ? AND status = 'Sold' AND close_date IS NOT NULL
            GROUP BY 1
        ),
        redfin_monthly AS (
            SELECT
                date_trunc('month', period_begin) AS month,
                median_sale_price AS redfin_median_sale_price,
                active_listings AS redfin_active_listings,
                months_of_supply AS redfin_months_supply,
                median_dom AS redfin_median_dom,
                new_listings AS redfin_new_listings,
                homes_sold AS redfin_homes_sold,
                sale_to_list_ratio AS redfin_sale_to_list_ratio,
                median_sale_price_psf AS redfin_median_sale_price_psf
            FROM redfin_market
            WHERE zip_code = ?
        ),
        zhvi_monthly AS (
            SELECT
                date_trunc('month', month) AS month,
                zhvi
            FROM zhvi_trend
            WHERE zip_code = ?
        ),
        all_months AS (
            SELECT month FROM mls_monthly
            UNION
            SELECT month FROM redfin_monthly
            UNION
            SELECT month FROM zhvi_monthly
        )
        SELECT
            all_months.month,
            mls_monthly.mls_median_close_price,
            mls_monthly.mls_median_list_price,
            mls_monthly.mls_median_dom,
            mls_monthly.mls_closed_count,
            redfin_monthly.redfin_median_sale_price,
            redfin_monthly.redfin_active_listings,
            redfin_monthly.redfin_months_supply,
            redfin_monthly.redfin_median_dom,
            redfin_monthly.redfin_new_listings,
            redfin_monthly.redfin_homes_sold,
            redfin_monthly.redfin_sale_to_list_ratio,
            redfin_monthly.redfin_median_sale_price_psf,
            zhvi_monthly.zhvi
        FROM all_months
        LEFT JOIN mls_monthly USING (month)
        LEFT JOIN redfin_monthly USING (month)
        LEFT JOIN zhvi_monthly USING (month)
        ORDER BY all_months.month
        """,
        [zip_code, zip_code, zip_code],
    ).fetchall()

    cols = [
        "month",
        "mls_median_close_price",
        "mls_median_list_price",
        "mls_median_dom",
        "mls_closed_count",
        "redfin_median_sale_price",
        "redfin_active_listings",
        "redfin_months_supply",
        "redfin_median_dom",
        "redfin_new_listings",
        "redfin_homes_sold",
        "redfin_sale_to_list_ratio",
        "redfin_median_sale_price_psf",
        "zhvi",
    ]
    series = []
    for row in rows:
        record = dict(zip(cols, row))
        record["month"] = record["month"].isoformat()
        series.append(record)
    return series


@router.get("/trend")
def market_trend(zip: str):
    if zip not in VALID_ZIPS:
        raise HTTPException(status_code=400, detail=f"zip must be one of {VALID_ZIPS}")
    con = get_connection()
    return {"zip_code": zip, "series": _zip_trend(con, zip)}


@router.get("/compare")
def market_compare():
    con = get_connection()
    return {"zips": {z: _zip_trend(con, z) for z in VALID_ZIPS}}
