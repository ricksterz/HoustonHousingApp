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

export function getPropertyLookup(address) {
  if (IS_STATIC) {
    return getStatic(
      `property/${slugify(address)}.json`,
      `'${address.trim()}' is not included in this static site. Only pre-exported addresses are available.`
    );
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
