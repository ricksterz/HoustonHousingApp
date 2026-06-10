import { colors, fmt } from "./theme";

// columns: [{ key, label, type: 'currency'|'date'|'num'|'raw' }]
export default function Table({ columns, rows }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: colors.textDim, fontSize: 12, fontFamily: "monospace" }}>No data</div>;
  }
  const formatters = { currency: fmt.currency, date: fmt.date, num: fmt.num, pct: fmt.pct };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.textDim,
                  fontFamily: "monospace",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const f = formatters[c.type] || fmt.raw;
                return (
                  <td
                    key={c.key}
                    style={{
                      padding: "6px 10px",
                      borderBottom: `1px solid ${colors.borderAlt}`,
                      color: colors.text,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f(row[c.key])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
