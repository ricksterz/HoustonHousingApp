import { useState } from "react";
import { fmt, fmtCompactCurrency } from "./theme";

const METRO_FIELDS = [
  { key: "mortgage_rate_30yr", label: "30yr Mortgage Rate", fmt: (v) => `${v}%` },
  { key: "houston_hpi", label: "Houston MSA HPI", fmt: fmt.num },
  { key: "houston_active_listings", label: "Active Listings", fmt: fmt.num },
  { key: "houston_median_dom", label: "Median DOM", fmt: (v) => `${Math.round(v)} days` },
  { key: "houston_list_price_sqft", label: "List Price/SqFt", fmt: (v) => `$${v}` },
];

const HEIGHTS_FIELDS = [
  { key: "median_sale_price", label: "Median Sale Price", fmt: fmtCompactCurrency },
  { key: "zhvi", label: "Avg Home Value (ZHVI)", fmt: fmtCompactCurrency },
  { key: "active_listings", label: "Active Listings", fmt: (v) => fmt.num(Math.round(v)) },
  { key: "median_dom", label: "Median DOM", fmt: (v) => `${Math.round(v)} days` },
  { key: "months_supply", label: "Months of Supply", fmt: (v) => Number(v).toFixed(1) },
];

export default function MacroHeader({ macro, heights, loading }) {
  const [scope, setScope] = useState("heights");
  const isHeights = scope === "heights";

  const mortgage = macro?.mortgage_rate_30yr;
  const fields = isHeights ? HEIGHTS_FIELDS : METRO_FIELDS;
  const source = isHeights ? heights : macro;

  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="stat-label" style={{ marginBottom: 0 }}>
          {isHeights ? "The Heights · 77007 / 77008 / 77009" : "Houston metro · FRED"}
        </div>
        <div className="seg">
          <button
            className={`seg-btn${isHeights ? " is-active" : ""}`}
            onClick={() => setScope("heights")}
            aria-pressed={isHeights}
          >
            Heights
          </button>
          <button
            className={`seg-btn${!isHeights ? " is-active" : ""}`}
            onClick={() => setScope("metro")}
            aria-pressed={!isHeights}
          >
            Houston Metro
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {isHeights && (
          <Stat
            label="30yr Mortgage Rate"
            value={loading ? "…" : mortgage?.value != null ? `${mortgage.value}%` : "—"}
            note={mortgage?.value != null ? `US · as of ${mortgage.date}` : mortgage?.error}
          />
        )}
        {fields.map((f) => {
          const entry = source?.[f.key];
          const value = entry?.value;
          return (
            <Stat
              key={f.key}
              label={f.label}
              value={loading ? "…" : value != null ? f.fmt(value) : "—"}
              note={
                value != null
                  ? `as of ${entry.date}`
                  : entry?.error || (loading ? null : "unavailable")
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value stat-value--accent" style={{ fontSize: 17 }}>
        {value}
      </div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}
