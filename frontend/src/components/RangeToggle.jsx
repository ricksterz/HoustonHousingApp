import { RANGES } from "./rangeUtils";

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
