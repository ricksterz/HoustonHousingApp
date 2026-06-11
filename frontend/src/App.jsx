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
    <div className="app-shell">
      <div className="container app-main">
        <header style={{ marginBottom: 28 }}>
          {IS_STATIC && meta?.generated && (
            <div style={{ display: "flex", marginBottom: 10 }}>
              <span className="snapshot-badge" style={{ marginLeft: "auto" }}>
                Snapshot · data as of {meta.generated.slice(0, 10)}
              </span>
            </div>
          )}
          <h1 className="app-title">Houston Heights Housing Analytics</h1>
          <p className="app-subtitle">
            Home values, market velocity, and property records for ZIP codes{" "}
            <Zip color={colors.zip77007}>77007</Zip>, <Zip color={colors.zip77008}>77008</Zip> and{" "}
            <Zip color={colors.zip77009}>77009</Zip> — built on MLS (HAR), Zillow ZHVI, Redfin, HCAD,
            and FRED data.
          </p>
        </header>

        <MacroHeader macro={macro} loading={macroLoading} />

        <nav className="btn-row" aria-label="Main navigation">
          <button
            className={`btn${view === "overview" ? " is-active" : ""}`}
            onClick={() => setView("overview")}
          >
            Market Overview
          </button>
          <button
            className={`btn${view === "property" ? " is-active" : ""}`}
            onClick={() => setView("property")}
          >
            Property Lookup
          </button>
        </nav>

        {view === "overview" ? <ZipOverview /> : <PropertyLookup />}
      </div>

      <Footer generated={meta?.generated} />
    </div>
  );
}

function Zip({ color, children }) {
  return <span style={{ color, fontFamily: "var(--mono)", fontWeight: 700 }}>{children}</span>;
}
