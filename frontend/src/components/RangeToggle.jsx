// Time-range presets for trend charts. Charts default to recent history
// ("Since 2020"); older data stays one click away.
export const RANGES = [
  { id: "2020", label: "Since 2020" },
  { id: "10y", label: "10Y" },
  { id: "max", label: "Max" },
];

export function rangeCutoff(id) {
  if (id === "2020") return "2020-01";
  if (id === "10y") {
    const d = new Date();
    return `${d.getFullYear() - 10}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

// rows: array of objects with an ISO month string under `key`
export function filterRange(rows, id, key = "month") {
  const cutoff = rangeCutoff(id);
  if (!cutoff) return rows;
  return rows.filter((r) => r[key] >= cutoff);
}

export default function RangeToggle({ value, onChange }) {
  return (
    <div className="seg" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r.id}
          className={`seg-btn${value === r.id ? " is-active" : ""}`}
          onClick={() => onChange(r.id)}
          aria-pressed={value === r.id}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
