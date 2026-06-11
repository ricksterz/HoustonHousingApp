import { fmt } from "./theme";

const FIELDS = [
  { key: "mortgage_rate_30yr", label: "30yr Mortgage Rate", fmt: (v) => `${v}%` },
  { key: "houston_hpi", label: "Houston MSA HPI", fmt: fmt.num },
  { key: "houston_active_listings", label: "Active Listings (Houston)", fmt: fmt.num },
  { key: "houston_median_dom", label: "Median DOM (Houston)", fmt: (v) => `${v} days` },
  { key: "houston_list_price_sqft", label: "List Price/SqFt (Houston)", fmt: (v) => `$${v}` },
];

export default function MacroHeader({ macro, loading }) {
  return (
    <div className="panel">
      <div className="stat-grid">
        {FIELDS.map((f) => {
          const entry = macro?.[f.key];
          const value = entry?.value;
          return (
            <div key={f.key} className="stat" style={{ borderLeftColor: "rgba(200,133,26,0.4)" }}>
              <div className="stat-label">{f.label}</div>
              <div className="stat-value" style={{ color: "var(--gold)", fontSize: 16 }}>
                {loading ? "…" : value != null ? f.fmt(value) : "—"}
              </div>
              {entry?.error && !loading && <div className="stat-note">{entry.error}</div>}
              {entry?.date && value != null && <div className="stat-note">as of {entry.date}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
