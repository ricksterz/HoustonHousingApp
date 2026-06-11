import { useEffect, useState } from "react";
import { getMacroSnapshot, getStaticMeta, IS_STATIC } from "./api";
import Footer from "./components/Footer";
import MacroHeader from "./components/MacroHeader";
import { colors } from "./components/theme";
import PropertyLookup from "./views/PropertyLookup";
import ZipOverview from "./views/ZipOverview";

export default function App() {
  const [view, setView] = useState("overview");
  const [macro, setMacro] = useState(null);
  const [macroLoading, setMacroLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    getMacroSnapshot()
      .then(setMacro)
      .catch(() => setMacro(null))
      .finally(() => setMacroLoading(false));
    if (IS_STATIC) getStaticMeta().then(setMeta);
  }, []);

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100vh",
        color: colors.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "36px 24px 0", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box", flex: 1 }}>
        <header style={{ marginBottom: 28 }}>
          {IS_STATIC && meta?.generated && (
            <div style={{ display: "flex", marginBottom: 10 }}>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: colors.textDimmer,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                Snapshot · data as of {meta.generated.slice(0, 10)}
              </span>
            </div>
          )}
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              background: `linear-gradient(90deg, ${colors.textBright} 30%, ${colors.accentGold})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Houston Heights Housing Analytics
          </h1>
          <p style={{ margin: "10px 0 0", color: colors.textDim, fontSize: 14, maxWidth: 640 }}>
            Home values, market velocity, and property records for ZIP codes{" "}
            <Zip color={colors.zip77007}>77007</Zip>, <Zip color={colors.zip77008}>77008</Zip> and{" "}
            <Zip color={colors.zip77009}>77009</Zip> — built on MLS (HAR), Zillow ZHVI, Redfin, HCAD,
            and FRED data.
          </p>
        </header>

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

      <Footer generated={meta?.generated} />
    </div>
  );
}

function Zip({ color, children }) {
  return <span style={{ color, fontFamily: "monospace", fontWeight: 700 }}>{children}</span>;
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
