export const colors = {
  bg: "#0A0E17",
  panel: "#10151F",
  panelAlt: "#161C29",
  border: "#222A3A",
  borderAlt: "#1A2130",
  text: "#C4CEDD",
  textBright: "#EEF2F8",
  textDim: "#8B98AC",
  textDimmer: "#5F6C80",
  accentGold: "#D4922A",
  zip77007: "#5B8FDB",
  zip77008: "#3FA56E",
  zip77009: "#D9655E",
};

// Compact axis labels: 450000 -> $450K, 1200000 -> $1.2M
export const fmtCompactCurrency = (v) => {
  if (v == null) return "";
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
};

export const fmt = {
  currency: (v) =>
    v != null ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
  num: (v) => (v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"),
  pct: (v) => (v != null ? `${Number(v).toFixed(1)}%` : "—"),
  raw: (v) => (v != null && v !== "" ? String(v) : "—"),
  date: (v) => (v ? String(v) : "—"),
};

export function Badge({ text, color }) {
  return (
    <span
      style={{
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        fontSize: 11,
        padding: "2px 8px",
        fontFamily: "monospace",
        letterSpacing: "0.03em",
      }}
    >
      {text}
    </span>
  );
}
