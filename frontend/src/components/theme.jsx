export const colors = {
  bg: "#080C16",
  panel: "#0C1220",
  panelAlt: "#0C1826",
  border: "#1A2540",
  borderAlt: "#101820",
  text: "#C8D4E8",
  textBright: "#E0ECFF",
  textDim: "#7589A8",
  textDimmer: "#51678A",
  accentGold: "#C8851A",
  zip77007: "#4A9EE8",
  zip77008: "#34A853",
  zip77009: "#E85555",
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
