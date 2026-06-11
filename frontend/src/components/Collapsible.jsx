import { useState } from "react";

export default function Collapsible({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapsible${open ? " is-open" : ""}`}>
      <button className="collapsible-header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          {title} {count != null && <span className="collapsible-count">({count})</span>}
        </span>
        <span className="collapsible-chevron">▼</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
