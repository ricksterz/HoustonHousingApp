import re

from fastapi import APIRouter, HTTPException

from ..db import get_connection
from ..valuation import estimate_for_account

router = APIRouter(prefix="/api/property", tags=["property"])


def _normalize(address: str) -> str:
    return re.sub(r"\s+", " ", address.strip().upper())


@router.get("/lookup")
def property_lookup(address: str):
    con = get_connection()
    needle = _normalize(address)

    accounts = con.execute(
        "SELECT * FROM hcad_accounts WHERE site_address_norm = ?", [needle]
    ).fetchall()
    cols = [c[0] for c in con.description]

    if not accounts:
        accounts = con.execute(
            "SELECT * FROM hcad_accounts WHERE site_address_norm LIKE ?", [f"%{needle}%"]
        ).fetchall()
        cols = [c[0] for c in con.description]

    if not accounts:
        raise HTTPException(status_code=404, detail=f"No HCAD record found for address '{address}'")

    account = dict(zip(cols, accounts[0]))
    acct = account["acct"]

    buildings = con.execute(
        "SELECT * FROM hcad_buildings WHERE acct = ? ORDER BY bld_num", [acct]
    ).fetchall()
    bcols = [c[0] for c in con.description]
    buildings = [dict(zip(bcols, b)) for b in buildings]

    ownership = con.execute(
        "SELECT * FROM ownership_history WHERE acct = ? ORDER BY purchase_date DESC", [acct]
    ).fetchall()
    ocols = [c[0] for c in con.description]
    ownership = [dict(zip(ocols, o)) for o in ownership]

    permits = con.execute(
        "SELECT * FROM permits WHERE acct = ? ORDER BY issue_date DESC LIMIT 10", [acct]
    ).fetchall()
    pcols = [c[0] for c in con.description]
    permits = [dict(zip(pcols, p)) for p in permits]

    listings = con.execute(
        """
        SELECT mls_number, status, property_type, list_price, close_price, list_date,
               close_date, dom, cdom, bedrooms, baths_full, baths_half, building_sqft, year_built
        FROM mls_listings
        WHERE UPPER(REGEXP_REPLACE(street_address, '\\s+', ' ', 'g')) = ?
           OR UPPER(REGEXP_REPLACE(street_address, '\\s+', ' ', 'g')) LIKE ?
        ORDER BY COALESCE(close_date, list_date) DESC
        """,
        [needle, f"{needle}%"],
    ).fetchall()
    lcols = [c[0] for c in con.description]
    listings = [dict(zip(lcols, l)) for l in listings]

    def serialize(records):
        out = []
        for rec in records:
            r = {}
            for k, v in rec.items():
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
                else:
                    r[k] = v
            out.append(r)
        return out

    return {
        "hcad": serialize([account])[0],
        "buildings": serialize(buildings),
        "ownership_history": serialize(ownership),
        "permits": serialize(permits),
        "mls_listings": serialize(listings),
        "valuation": estimate_for_account(con, acct),
    }
