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
import Table from "../components/Table";
import { colors, fmt, fmtCompactCurrency } from "../components/theme";

export default function PropertyLookup() {
  const [address, setAddress] = useState("726 E 21ST ST");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertyCount, setPropertyCount] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    const zip = data?.hcad?.zip_code?.trim();
    if (data?.valuation && zip) {
      getMarketTrend(zip)
        .then((t) => setTrend(t.series))
        .catch(() => setTrend(null));
    } else {
      setTrend(null);
    }
  }, [data]);

  useEffect(() => {
    if (IS_STATIC) {
      getStaticMeta().then((m) => setPropertyCount(m?.property_count ?? null));
      getAddressIndex(); // warm the index for autocomplete
    }
  }, []);

  function search(addr = address) {
    setSuggestions([]);
    setLoading(true);
    setError(null);
    setData(null);
    getPropertyLookup(addr)
      .then(setData)
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
          placeholder="Street address, e.g. 726 E 21ST ST"
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
          <ValuationSummary hcad={data.hcad} buildings={data.buildings} />

          {data.valuation && <ValuationRange valuation={data.valuation} hcad={data.hcad} trend={trend} />}

          {data.mls_listings.length > 0 && (
            <Section title="MLS listing history">
              <Table
                columns={[
                  { key: "status", label: "Status" },
                  { key: "list_date", label: "List Date", type: "date" },
                  { key: "close_date", label: "Close Date", type: "date" },
                  { key: "list_price", label: "List Price", type: "currency" },
                  { key: "close_price", label: "Close Price", type: "currency" },
                  { key: "dom", label: "DOM" },
                  { key: "bedrooms", label: "Beds" },
                  { key: "baths_full", label: "Baths" },
                  { key: "building_sqft", label: "SqFt", type: "num" },
                ]}
                rows={data.mls_listings}
              />
            </Section>
          )}

          <Section title="Buildings">
            <Table
              columns={[
                { key: "bld_num", label: "Bldg #" },
                { key: "structure_desc", label: "Type" },
                { key: "year_built", label: "Year Built" },
                { key: "year_remodeled", label: "Remodeled" },
                { key: "im_sq_ft", label: "SqFt", type: "num" },
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
    zhvi_as_of,
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
      <div className="panel-title panel-title--gold">Estimated market value range</div>

      <div className="range-stats">
        <RangeStat label="Low · 25th pct" value={fmt.currency(est_low)} />
        <RangeStat label="Mid · median" value={fmt.currency(est_mid)} variant="mid" />
        <RangeStat label="High · 75th pct" value={fmt.currency(est_high)} />
        {hcadVal && <RangeStat label="HCAD market value" value={fmt.currency(hcadVal)} variant="ref" />}
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
          <div className="stat-label" style={{ marginBottom: 8 }}>
            Implied value history · mid estimate × ZIP ZHVI index
          </div>
          <div className="chart-box chart-box--sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={implied}>
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
        Based on {comp_count} comparable MLS sales in ZIP {hcad.zip_code?.trim()} over the last{" "}
        {window_months} months, within ±{sqft_band_pct}% of this property's {fmt.num(sqft_used)} sqft
        {year_band_applied ? " and a similar build year" : ""}; each comp's $/sqft is adjusted to{" "}
        {zhvi_as_of} using the ZIP's Zillow Home Value Index (mid estimate ≈ ${ppsf_mid}/sqft).
        This is a statistical estimate for informational purposes only — not an appraisal. Condition,
        renovations, and lot characteristics are not considered.
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

function ValuationSummary({ hcad, buildings }) {
  const totalSqft = buildings.reduce((sum, b) => sum + (b.im_sq_ft || 0), 0);
  const yearBuilt = buildings.length ? Math.min(...buildings.map((b) => b.year_built).filter(Boolean)) : null;

  const stats = [
    { label: "Site Address", value: hcad.site_address },
    { label: "Market Value", value: fmt.currency(hcad.tot_mkt_val), accent: true },
    { label: "Assessed Value", value: fmt.currency(hcad.assessed_val) },
    { label: "Land Value", value: fmt.currency(hcad.land_val) },
    { label: "Improvement Value", value: fmt.currency(hcad.bld_val) },
    { label: "Year Built", value: fmt.raw(yearBuilt) },
    { label: "Total SqFt (HCAD)", value: fmt.num(totalSqft) },
    { label: "Lot Size (acres)", value: fmt.num(hcad.acreage) },
    { label: "Owner", value: fmt.raw(hcad.owner_name) },
    { label: "Neighborhood", value: fmt.raw(hcad.market_area_1_dscr) },
    { label: "Protested", value: hcad.protested === "Y" ? "Yes" : "No" },
    { label: "Account", value: hcad.acct },
  ];

  return (
    <div className="panel">
      <div className="stat-grid">
        {stats.map(({ label, value, accent }) => (
          <div key={label} className="stat">
            <div className="stat-label">{label}</div>
            <div className={`stat-value${accent ? " stat-value--accent" : ""}`} title={String(value)}>
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
