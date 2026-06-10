const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getMarketTrend(zip) {
  return get(`/api/market/trend?zip=${encodeURIComponent(zip)}`);
}

export function getMarketCompare() {
  return get(`/api/market/compare`);
}

export function getPropertyLookup(address) {
  return get(`/api/property/lookup?address=${encodeURIComponent(address)}`);
}

export function getMacroSnapshot() {
  return get(`/api/macro/snapshot`);
}
