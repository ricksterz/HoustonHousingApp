// In static mode (GitHub Pages) the app reads pre-exported JSON from /data
// instead of calling the FastAPI backend. Regenerate with: python etl/export_static.py
export const IS_STATIC = import.meta.env.VITE_STATIC_DATA === "true";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DATA_BASE = `${import.meta.env.BASE_URL}data`;

function slugify(address) {
  return address
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function getStatic(file, missingMessage) {
  const res = await fetch(`${DATA_BASE}/${file}`);
  if (!res.ok) {
    throw new Error(missingMessage || `Failed to load ${file} (${res.status})`);
  }
  return res.json();
}

export function getMarketTrend(zip) {
  if (IS_STATIC) return getStatic(`trend_${zip}.json`);
  return get(`/api/market/trend?zip=${encodeURIComponent(zip)}`);
}

export function getMarketCompare() {
  if (IS_STATIC) return getStatic("compare.json");
  return get(`/api/market/compare`);
}

// Sorted list of every exported property address, fetched once and cached.
let addressIndexPromise = null;
export function getAddressIndex() {
  if (!addressIndexPromise) {
    addressIndexPromise = getStatic("addresses.json").catch(() => []);
  }
  return addressIndexPromise;
}

export async function getPropertyLookup(address) {
  if (IS_STATIC) {
    const needle = address.trim().toUpperCase().replace(/\s+/g, " ");
    try {
      return await getStatic(`property/${slugify(address)}.json`);
    } catch {
      // Mirror the backend's exact-then-LIKE fallback using the address index.
      const index = await getAddressIndex();
      const match =
        index.find((a) => a.startsWith(needle)) || index.find((a) => a.includes(needle));
      if (match) return getStatic(`property/${slugify(match)}.json`);
      throw new Error(`No HCAD record found for address '${address.trim()}'`);
    }
  }
  return get(`/api/property/lookup?address=${encodeURIComponent(address)}`);
}

export function getMacroSnapshot() {
  if (IS_STATIC) return getStatic("macro.json");
  return get(`/api/macro/snapshot`);
}

// Static-build metadata: export timestamp + list of bundled addresses.
// Returns null when unavailable (e.g. dev mode against the live API).
export function getStaticMeta() {
  return getStatic("meta.json").catch(() => null);
}

// Latest Heights-wide stats, aggregated across the 3 ZIPs from the trend data
// (sum for counts, average for prices/ratios). Each entry: {value, date}.
export async function getHeightsSnapshot() {
  const { zips } = await getMarketCompare();
  const series = Object.values(zips);

  // Some sources serialize numbers as strings — coerce and skip non-numerics.
  const latest = (s, key) => {
    for (let i = s.length - 1; i >= 0; i--) {
      const v = Number(s[i][key]);
      if (s[i][key] != null && Number.isFinite(v)) return { value: v, month: s[i].month };
    }
    return null;
  };

  const agg = (key, mode) => {
    const pts = series.map((s) => latest(s, key)).filter(Boolean);
    if (!pts.length) return null;
    const total = pts.reduce((a, p) => a + p.value, 0);
    return {
      value: mode === "sum" ? total : total / pts.length,
      date: pts.map((p) => p.month).sort()[0].slice(0, 7),
    };
  };

  return {
    median_sale_price: agg("redfin_median_sale_price", "avg"),
    zhvi: agg("zhvi", "avg"),
    sale_to_list_ratio: agg("redfin_sale_to_list_ratio", "avg"),
    median_sale_price_psf: agg("redfin_median_sale_price_psf", "avg"),
    active_listings: agg("redfin_active_listings", "sum"),
    median_dom: agg("redfin_median_dom", "avg"),
    months_supply: agg("redfin_months_supply", "avg"),
  };
}
