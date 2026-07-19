import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAddressIndex, getMarketTrend, getPropertyLookup, getStaticMeta, IS_STATIC } from "../api";
import Collapsible from "../components/Collapsible";
import RangeToggle from "../components/RangeToggle";
import { filterRange } from "../components/rangeUtils";
import Table from "../components/Table";
import { colors, fmt, fmtCompactCurrency } from "../components/theme";

function fmtLotSize(acreage) {
  if (acreage == null || acreage === "") return "—";
  const ac = Number(acreage);
  if (isNaN(ac) || ac === 0) return "—";
  const sqft = Math.round(ac * 43560);
  if (ac < 0.5) return `${sqft.toLocaleString()} sq ft`;
  return `${sqft.toLocaleString()} sq ft (${ac.toFixed(2)} ac)`;
}

// Most-recent listing decides the sale status. This HAR export contains only
// Sold + pending-stage statuses; "Active" is handled for future exports.
function listingStatus(listings) {
  const latest = listings?.[0];
  if (!latest || latest.close_date) return { label: "Not listed", tone: "var(--text-dim)" };
  const s = (latest.status || "").toLowerCase();
  if (s.includes("active")) return { label: "For sale · Active", tone: "var(--green)" };
  if (s.includes("pend")) return { label: `Pending sale · ${latest.status}`, tone: "var(--gold)" };
  return { label: latest.status || "Not listed", tone: "var(--text-dim)" };
}

function lastClosedDate(listings) {
  const dates = (listings || []).map((l) => l.close_date).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export default function PropertyLookup({ initialQuery = "", onSearch }) {
  const [address, setAddress] = useState(initialQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertyCount, setPropertyCount] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [trend, setTrend] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const zip = data?.hcad?.zip_code?.trim();
    if (!(data?.valuation && zip)) return;
    getMarketTrend(zip)
      .then((t) => setTrend(t.series))
      .catch(() => setTrend(null));
  }, [data]);

  useEffect(() => {
    if (IS_STATIC) {
      getStaticMeta().then((m) => setPropertyCount(m?.property_count ?? null));
      getAddressIndex(); // warm the index for autocomplete
    }
  }, []);

  // Auto-search when arriving via a shared URL
  useEffect(() => {
    if (initialQuery) search(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function share() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function search(addr = address) {
    if (!addr.trim()) return;
    setSuggestions([]);
    setLoading(true);
    setError(null);
    setData(null);
    setTrend(null);
    getPropertyLookup(addr)
      .then((d) => { setData(d); onSearch?.(addr); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function onInput(value) {
    setAddress(value);
    if (!IS_STATIC) return;
    const needle = value.trim().toUpperCase().replace(/\s+/g, " ");
    if (needle.length < 3) {
      setSuggestions([]);
      return;
    }
    const index = await getAddressIndex();
    const starts = index.filter((a) => a.startsWith(needle));
    const contains =
      starts.length >= 8 ? [] : index.filter((a) => !a.startsWith(needle) && a.includes(needle));
    setSuggestions([...starts, ...contains].slice(0, 8));
  }

  return (
    <div>
      {IS_STATIC && propertyCount && (
        <div className="num" style={{ fontSize: 12, color: "var(--text-dimmer)", marginBottom: 10 }}>
          {propertyCount.toLocaleString()} properties available across 77007 / 77008 / 77009
        </div>
      )}

      <div className="search-row">
        <input
          className="search-input"
          value={address}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Street address, e.g. 2714 HARVARD ST"
          aria-label="Street address"
        />
        {suggestions.length > 0 && (
          <div className="suggestions" role="listbox">
            {suggestions.map((addr) => (
              <div
                key={addr}
                role="option"
                className="suggestion"
                onMouseDown={() => {
                  setAddress(addr);
                  search(addr);
                }}
              >
                {addr}
              </div>
            ))}
          </div>
        )}
        <button className="btn-primary" onClick={() => search()} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <div style={{ color: "var(--red)", fontSize: 13 }}>Error: {error}</div>}

      {data && (
        <>
          <ValuationSummary
            hcad={data.hcad}
            buildings={data.buildings}
            valuation={data.valuation}
            listings={data.mls_listings}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 8 }}>
            <button className="share-btn" onClick={share} title="Copy shareable link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {copied ? "Copied!" : "Share"}
            </button>
          </div>

          {data.valuation && <ValuationRange valuation={data.valuation} hcad={data.hcad} trend={trend} />}

          {data.mls_listings.length > 0 && (
            <Section title="MLS listing history">
              <Table
                columns={[
                  { key: "status", label: "Status" },
                  { key: "list_date", label: "Listed", type: "date" },
                  { key: "close_date", label: "Closed", type: "date" },
                  { key: "list_price", label: "List Price", type: "currency" },
                  { key: "close_price", label: "Sale Price", type: "currency" },
                  { key: "dom", label: "Days on Mkt" },
                  { key: "bedrooms", label: "Beds" },
                  { key: "baths_full", label: "Baths" },
                  { key: "building_sqft", label: "Sq Ft", type: "num" },
                ]}
                rows={data.mls_listings}
              />
            </Section>
          )}

          <Section title="Buildings">
            <Table
              columns={[
                { key: "bld_num", label: "#" },
                { key: "structure_desc", label: "Type" },
                { key: "year_built", label: "Year Built" },
                { key: "year_remodeled", label: "Remodeled" },
                { key: "im_sq_ft", label: "Sq Ft", type: "num" },
              ]}
              rows={data.buildings}
            />
          </Section>

          <Collapsible title="Ownership history" count={data.ownership_history.length}>
            <Table
              columns={[
                { key: "purchase_date", label: "Purchase Date", type: "date" },
                { key: "owner_name", label: "Owner" },
              ]}
              rows={data.ownership_history}
            />
          </Collapsible>

          <Collapsible title="Permit history" count={data.permits.length}>
            <Table
              columns={[
                { key: "issue_date", label: "Issue Date", type: "date" },
                { key: "permit_type_desc", label: "Type" },
                { key: "description", label: "Description" },
                { key: "status", label: "Status" },
              ]}
              rows={data.permits}
            />
          </Collapsible>
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {children}
    </div>
  );
}

function ValuationRange({ valuation, hcad, trend }) {
  const [range, setRange] = useState("2020");
  const {
    est_low,
    est_mid,
    est_high,
    comp_count,
    window_months,
    sqft_band_pct,
    year_band_applied,
    sqft_used,
    ppsf_mid,
    index_as_of,
    confidence,
    spread_pct,
  } = valuation;
  const hcadVal = Number(hcad.tot_mkt_val) || null;

  const scaleMin = Math.min(est_low, hcadVal ?? est_low) * 0.92;
  const scaleMax = Math.max(est_high, hcadVal ?? est_high) * 1.08;
  const pos = (v) => `${(((v - scaleMin) / (scaleMax - scaleMin)) * 100).toFixed(1)}%`;

  let implied = null;
  if (trend) {
    const zhviPts = trend.filter((d) => d.zhvi != null);
    const last = zhviPts[zhviPts.length - 1];
    if (last) {
      implied = zhviPts.map((d) => ({
        monthLabel: d.month.slice(0, 7),
        implied: Math.round((d.zhvi / last.zhvi) * est_mid),
      }));
    }
  }

  return (
    <div className="panel panel--gold">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div className="panel-title panel-title--gold" style={{ margin: 0 }}>Estimated market value range</div>
        {confidence && (
          <span className={`confidence-badge confidence-badge--${confidence}`}>
            {confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : `Low confidence · ${spread_pct}% range`}
          </span>
        )}
      </div>

      <div className="range-stats">
        <RangeStat label="Low (25th percentile)" value={fmt.currency(est_low)} />
        <RangeStat label="Mid (median)" value={fmt.currency(est_mid)} variant="mid" />
        <RangeStat label="High (75th percentile)" value={fmt.currency(est_high)} />
        {hcadVal && <RangeStat label="HCAD Market Value" value={fmt.currency(hcadVal)} variant="ref" />}
      </div>

      <div style={{ position: "relative", height: 44, margin: "0 8px 14px" }}>
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 3,
            background: "var(--border-alt)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 18,
            left: pos(est_low),
            width: `calc(${pos(est_high)} - ${pos(est_low)})`,
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${colors.accentGold}55, ${colors.accentGold})`,
          }}
        />
        {[
          [est_low, "var(--text-dim)"],
          [est_mid, "var(--gold)"],
          [est_high, "var(--text-dim)"],
        ].map(([v, c]) => (
          <div
            key={v}
            style={{
              position: "absolute",
              top: 13,
              left: pos(v),
              width: 2,
              height: 16,
              background: c,
              transform: "translateX(-1px)",
            }}
          />
        ))}
        {hcadVal && hcadVal >= scaleMin && hcadVal <= scaleMax && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: pos(hcadVal),
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", whiteSpace: "nowrap" }}>
              HCAD ▾
            </div>
          </div>
        )}
      </div>

      {implied && implied.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <div className="stat-label" style={{ marginBottom: 0 }}>
              Implied value history · mid estimate × ZIP ZHVI index
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <div className="chart-box chart-box--sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filterRange(implied, range, "monthLabel")}>
                <CartesianGrid stroke={colors.borderAlt} vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={50} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtCompactCurrency}
                  domain={["auto", "auto"]}
                  width={52}
                />
                <Tooltip formatter={(v) => fmtCompactCurrency(v)} />
                <Line type="monotone" dataKey="implied" name="Implied Value" stroke={colors.accentGold} dot={false} strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="method-note">
        Based on {comp_count} comparable sales in ZIP {hcad.zip_code?.trim()} over the past{" "}
        {window_months} months, filtered to homes within ±{sqft_band_pct}% of {fmt.int(sqft_used)} sq ft
        {year_band_applied ? " and a similar build year" : ""}. Each sale's price per sq ft is
        time-adjusted to {fmt.monthYear(index_as_of)} using a townhome vs. single-family price index
        for this ZIP (≈ ${ppsf_mid}/sq ft at the median). Brand-new construction is excluded.
        This is a statistical estimate — not an appraisal. Condition, renovations, and finishes are not considered.
      </div>
    </div>
  );
}

function RangeStat({ label, value, variant }) {
  const cls =
    variant === "mid"
      ? "range-stat-value range-stat-value--mid"
      : variant === "ref"
        ? "range-stat-value range-stat-value--ref"
        : "range-stat-value";
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={cls}>{value}</div>
    </div>
  );
}

function ValuationSummary({ hcad, buildings, valuation, listings }) {
  const totalSqft = buildings.reduce((sum, b) => sum + (b.im_sq_ft || 0), 0);
  const yearBuilt = buildings.length ? Math.min(...buildings.map((b) => b.year_built).filter(Boolean)) : null;
  const status = listingStatus(listings);
  const lastClosed = lastClosedDate(listings);

  const stats = [
    { label: "Address", value: hcad.site_address },
    {
      label: "Value Estimate",
      value: valuation ? `${fmtCompactCurrency(valuation.est_low)} – ${fmtCompactCurrency(valuation.est_high)}` : "—",
      accent: true,
      title: valuation
        ? `${fmt.currency(valuation.est_low)} – ${fmt.currency(valuation.est_high)} (comps-based, see range below)`
        : "Not enough comparable sales",
    },
    { label: "Listing Status", value: status.label, tone: status.tone },
    { label: "Last Sale Date", value: fmt.date(lastClosed) },
    { label: "HCAD Market Value", value: fmt.currency(hcad.tot_mkt_val) },
    { label: "Assessed Value", value: fmt.currency(hcad.assessed_val) },
    { label: "Land Value", value: fmt.currency(hcad.land_val) },
    { label: "Building Value", value: fmt.currency(hcad.bld_val) },
    { label: "Year Built", value: fmt.raw(yearBuilt) },
    { label: "Living Area", value: totalSqft ? `${fmt.int(totalSqft)} sq ft` : "—" },
    { label: "Lot Size", value: fmtLotSize(hcad.acreage) },
    { label: "Owner", value: fmt.raw(hcad.owner_name) },
    { label: "Neighborhood", value: fmt.raw(hcad.market_area_1_dscr) },
    ...(hcad.protested === "Y" ? [{ label: "Tax Protest", value: "Filed", tone: "var(--gold)" }] : []),
    { label: "HCAD Account", value: hcad.acct },
  ];

  return (
    <div className="panel">
      <div className="stat-grid">
        {stats.map(({ label, value, accent, tone, title }) => (
          <div key={label} className="stat">
            <div className="stat-label">{label}</div>
            <div
              className={`stat-value${accent ? " stat-value--accent" : ""}`}
              style={tone ? { color: tone } : undefined}
              title={title || String(value)}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      {hcad.legal_description && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: "1px solid var(--border-alt)",
            color: "var(--text-dimmer)",
            fontSize: 12,
          }}
        >
          Legal: {hcad.legal_description}
        </div>
      )}
    </div>
  );
}
