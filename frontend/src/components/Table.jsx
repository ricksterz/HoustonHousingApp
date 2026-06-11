import { fmt } from "./theme";

// columns: [{ key, label, type: 'currency'|'date'|'num'|'raw' }]
export default function Table({ columns, rows }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12, fontFamily: "var(--mono)" }}>No data</div>;
  }
  const formatters = { currency: fmt.currency, date: fmt.date, num: fmt.num, pct: fmt.pct };
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const f = formatters[c.type] || fmt.raw;
                return <td key={c.key}>{f(row[c.key])}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
