import { colors, fmt } from "./theme";

const FIELDS = [
  { key: "mortgage_rate_30yr", label: "30yr Mortgage Rate", fmt: (v) => `${v}%` },
  { key: "houston_hpi", label: "Houston MSA HPI", fmt: fmt.num },
  { key: "houston_active_listings", label: "Active Listings (Houston)", fmt: fmt.num },
  { key: "houston_median_dom", label: "Median DOM (Houston)", fmt: (v) => `${v} days` },
  { key: "houston_list_price_sqft", label: "List Price/SqFt (Houston)", fmt: (v) => `$${v}` },
];

export default function MacroHeader({ macro, loading }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 24,
      }}
    >
      {FIELDS.map((f) => {
        const entry = macro?.[f.key];
        const value = entry?.value;
        return (
          <div key={f.key} style={{ borderLeft: `2px solid ${colors.accentGold}55`, paddingLeft: 10 }}>
            <div style={{ fontSize: 10, color: colors.textDimmer, fontFamily: "monospace", marginBottom: 2 }}>
              {f.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.accentGold, fontFamily: "monospace" }}>
              {loading ? "…" : value != null ? f.fmt(value) : "—"}
            </div>
            {entry?.error && !loading && (
              <div style={{ fontSize: 9, color: colors.textDimmer, marginTop: 2 }}>{entry.error}</div>
            )}
            {entry?.date && value != null && (
              <div style={{ fontSize: 9, color: colors.textDimmer, marginTop: 2 }}>as of {entry.date}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
