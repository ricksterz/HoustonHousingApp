import { useState } from "react";
import { colors } from "./theme";

export default function Collapsible({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, marginTop: 12, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: colors.panel,
          fontSize: 13,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        <span>
          {title} {count != null && <span style={{ color: colors.textDim, fontWeight: 400 }}>({count})</span>}
        </span>
        <span style={{ color: colors.textDim, fontFamily: "monospace" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "12px 14px", background: colors.panelAlt }}>{children}</div>}
    </div>
  );
}
