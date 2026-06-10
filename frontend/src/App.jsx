import { useEffect, useState } from "react";
import { getMacroSnapshot } from "./api";
import MacroHeader from "./components/MacroHeader";
import { colors } from "./components/theme";
import PropertyLookup from "./views/PropertyLookup";
import ZipOverview from "./views/ZipOverview";

export default function App() {
  const [view, setView] = useState("overview");
  const [macro, setMacro] = useState(null);
  const [macroLoading, setMacroLoading] = useState(true);

  useEffect(() => {
    getMacroSnapshot()
      .then(setMacro)
      .catch(() => setMacro(null))
      .finally(() => setMacroLoading(false));
  }, []);

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100vh",
        color: colors.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: 1100,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 6,
              height: 24,
              background: "linear-gradient(180deg, #C8851A, #8B5CF6)",
              borderRadius: 3,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: colors.textDimmer,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Houston Housing Analytics
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: colors.textBright, letterSpacing: "-0.02em" }}>
          77007 / 77008 / 77009 Market Dashboard
        </h1>
        <p style={{ margin: "8px 0 0", color: colors.textDimmer, fontSize: 13 }}>
          MLS (HAR) · Zillow ZHVI · Redfin · HCAD · FRED
        </p>
      </div>

      <MacroHeader macro={macro} loading={macroLoading} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <NavButton active={view === "overview"} onClick={() => setView("overview")}>
          Market Overview
        </NavButton>
        <NavButton active={view === "property"} onClick={() => setView("property")}>
          Property Lookup
        </NavButton>
      </div>

      {view === "overview" ? <ZipOverview /> : <PropertyLookup />}
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? colors.accentGold + "22" : "transparent",
        border: `1px solid ${active ? colors.accentGold + "88" : colors.border}`,
        color: active ? colors.accentGold : colors.textDim,
        borderRadius: 6,
        padding: "8px 18px",
        fontSize: 13,
        fontFamily: "monospace",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
