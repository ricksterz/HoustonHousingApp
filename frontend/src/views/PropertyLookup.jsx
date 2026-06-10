import { useState } from "react";
import { getPropertyLookup } from "../api";
import Collapsible from "../components/Collapsible";
import Table from "../components/Table";
import { colors, fmt } from "../components/theme";

export default function PropertyLookup() {
  const [address, setAddress] = useState("726 E 21ST ST");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function search() {
    setLoading(true);
    setError(null);
    setData(null);
    getPropertyLookup(address)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
        <button
          onClick={search}
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
