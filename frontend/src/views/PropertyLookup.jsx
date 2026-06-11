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
import { colors, fmt } from "../components/theme";

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
        <div style={{ fontSize: 11, color: colors.textDimmer, fontFamily: "monospace", marginBottom: 10 }}>
          {propertyCount.toLocaleString()} properties available across 77007 / 77008 / 77009
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 24, position: "relative" }}>
        <input
          value={address}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Street address, e.g. 726 E 21ST ST"
          style={{
            flex: 1,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: colors.text,
            fontSize: 13,
            padding: "8px 12px",
            fontFamily: "monospace",
            outline: "none",
          }}
        />
        {suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 110,
              background: colors.panelAlt,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              zIndex: 10,
              overflow: "hidden",
            }}
          >
            {suggestions.map((addr) => (
              <div
                key={addr}
                onMouseDown={() => {
                  setAddress(addr);
                  search(addr);
                }}
                style={{
                  padding: "7px 12px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: colors.text,
                  cursor: "pointer",
                  borderBottom: `1px solid ${colors.borderAlt}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.panel)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {addr}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => search()}
          disabled={loading}
          style={{
            background: loading ? colors.panel : `linear-gradient(135deg, ${colors.accentGold}, #A06010)`,
            border: "none",
            borderRadius: 6,
            color: loading ? colors.textDim : "#FFF8F0",
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <div style={{ color: colors.zip77009, fontFamily: "monospace" }}>Error: {error}</div>}

      {data && (
        <>
          <ValuationSummary hcad={data.hcad} buildings={data.buildings} />

          {data.valuation && <ValuationRange valuation={data.valuation} hcad={data.hcad} trend={trend} />}

          {data.mls_listings.length > 0 && (
            <Section title="MLS Listing History">
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

          <Collapsible title="Ownership History" count={data.ownership_history.length}>
            <Table
              columns={[
                { key: "purchase_date", label: "Purchase Date", type: "date" },
                { key: "owner_name", label: "Owner" },
              ]}
              rows={data.ownership_history}
            />
          </Collapsible>

          <Collapsible title="Permit History" count={data.permits.length}>
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
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.textDimmer,
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
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
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.accentGold}44`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.accentGold,
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Estimated Market Value Range
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <RangeStat label="Low (25th pct)" value={fmt.currency(est_low)} color={colors.textDim} size={16} />
        <RangeStat label="Mid (median)" value={fmt.currency(est_mid)} color={colors.accentGold} size={26} />
        <RangeStat label="High (75th pct)" value={fmt.currency(est_high)} color={colors.textDim} size={16} />
        {hcadVal && (
          <RangeStat label="HCAD Market Value" value={fmt.currency(hcadVal)} color={colors.zip77007} size={16} />
        )}
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
            background: colors.borderAlt,
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
          [est_low, colors.textDim],
          [est_mid, colors.accentGold],
          [est_high, colors.textDim],
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
          <div style={{ position: "absolute", top: 0, left: pos(hcadVal), transform: "translateX(-50%)", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: colors.zip77007, fontFamily: "monospace", whiteSpace: "nowrap" }}>HCAD ▼</div>
          </div>
        )}
      </div>

      {implied && implied.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: colors.textDimmer, fontFamily: "monospace", marginBottom: 6 }}>
            IMPLIED VALUE HISTORY (MID ESTIMATE × ZIP ZHVI INDEX)
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={implied}>
              <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: colors.textDim, fontFamily: "monospace" }} minTickGap={50} />
              <YAxis
                tick={{ fontSize: 10, fill: colors.textDim, fontFamily: "monospace" }}
                domain={["auto", "auto"]}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: colors.panelAlt,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              />
              <Line type="monotone" dataKey="implied" name="Implied Value" stroke={colors.accentGold} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: 10, color: colors.textDimmer, lineHeight: 1.6 }}>
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

function RangeStat({ label, value, color, size }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: colors.textDimmer, fontFamily: "monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: size, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function ValuationSummary({ hcad, buildings }) {
  const totalSqft = buildings.reduce((sum, b) => sum + (b.im_sq_ft || 0), 0);
  const yearBuilt = buildings.length ? Math.min(...buildings.map((b) => b.year_built).filter(Boolean)) : null;

  const stats = [
    { label: "Site Address", value: hcad.site_address, color: colors.zip77008 },
    { label: "Assessed Value", value: fmt.currency(hcad.assessed_val), color: colors.zip77007 },
    { label: "Market Value", value: fmt.currency(hcad.tot_mkt_val), color: colors.zip77007 },
    { label: "Land Value", value: fmt.currency(hcad.land_val), color: colors.accentGold },
    { label: "Improvement Value", value: fmt.currency(hcad.bld_val), color: colors.accentGold },
    { label: "Year Built", value: fmt.raw(yearBuilt), color: colors.zip77008 },
    { label: "Total SqFt (HCAD)", value: fmt.num(totalSqft), color: colors.zip77008 },
    { label: "Lot Size (acres)", value: fmt.num(hcad.acreage), color: colors.zip77008 },
    { label: "Owner", value: fmt.raw(hcad.owner_name), color: colors.zip77009 },
    { label: "Neighborhood", value: fmt.raw(hcad.market_area_1_dscr), color: colors.zip77009 },
    { label: "Protested", value: hcad.protested === "Y" ? "Yes" : "No", color: colors.zip77009 },
    { label: "Account", value: hcad.acct, color: colors.textDim },
  ];

  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{ borderLeft: `2px solid ${color}55`, paddingLeft: 10 }}>
            <div style={{ fontSize: 10, color: colors.textDimmer, fontFamily: "monospace", marginBottom: 2 }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color,
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={String(value)}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      {hcad.legal_description && (
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${colors.borderAlt}`, color: colors.textDim, fontSize: 11, fontFamily: "monospace" }}>
          Legal: {hcad.legal_description}
        </div>
      )}
    </div>
  );
}
