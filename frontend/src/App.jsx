import { useEffect, useState } from "react";
import { getHeightsSnapshot, getMacroSnapshot, getStaticMeta, IS_STATIC } from "./api";
import banner from "./assets/heights-19th-st.jpg";
import Footer from "./components/Footer";
import MacroHeader from "./components/MacroHeader";
import { colors } from "./components/theme";
import About from "./views/About";
import PropertyLookup from "./views/PropertyLookup";
import ZipOverview from "./views/ZipOverview";

function parseUrlState() {
  const p = new URLSearchParams(window.location.search);
  return { view: p.get("view") || "overview", q: p.get("q") || "" };
}

export default function App() {
  const [view, setView] = useState(() => parseUrlState().view);
  const [macro, setMacro] = useState(null);
  const [macroLoading, setMacroLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [heights, setHeights] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  function navigate(nextView) {
    setView(nextView);
    const p = new URLSearchParams(window.location.search);
    p.set("view", nextView);
    if (nextView !== "property") p.delete("q");
    history.replaceState(null, "", "?" + p.toString());
  }

  // Track SPA view changes as virtual pageviews in GA4
  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const titles = { overview: "Market Overview", property: "Property Lookup", about: "About & FAQ" };
    window.gtag("event", "page_view", {
      page_title: titles[view] ?? view,
      page_location: window.location.origin + "/?view=" + view,
    });
  }, [view]);

  useEffect(() => {
    getMacroSnapshot()
      .then(setMacro)
      .catch(() => setMacro(null))
      .finally(() => setMacroLoading(false));
    getHeightsSnapshot()
      .then(setHeights)
      .catch(() => setHeights(null));
    if (IS_STATIC) getStaticMeta().then(setMeta);
  }, []);

  return (
    <div className="app-shell">
      <div className="container app-main">
        <header className="hero">
          <div className="hero-bg" style={{ backgroundImage: `url(${banner})` }} />
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="header-tools">
              {IS_STATIC && meta?.generated && (
                <span className="snapshot-badge">
                  Snapshot · data as of {meta.generated.slice(0, 10)}
                </span>
              )}
              <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
            </div>
            <h1 className="app-title">Houston Heights Analytics</h1>
            <p className="app-subtitle">
              Home values, market velocity, and property records for ZIP codes{" "}
              <Zip color={colors.zip77007}>77007</Zip>, <Zip color={colors.zip77008}>77008</Zip> and{" "}
              <Zip color={colors.zip77009}>77009</Zip> — built on MLS (HAR), Zillow ZHVI, Redfin, HCAD,
              and FRED data.
            </p>
          </div>
        </header>

        <MacroHeader macro={macro} heights={heights} loading={macroLoading} />

        <nav className="btn-row" aria-label="Main navigation">
          <button
            className={`btn${view === "overview" ? " is-active" : ""}`}
            onClick={() => navigate("overview")}
          >
            Market Overview
          </button>
          <button
            className={`btn${view === "property" ? " is-active" : ""}`}
            onClick={() => navigate("property")}
          >
            Property Lookup
          </button>
          <button
            className={`btn${view === "about" ? " is-active" : ""}`}
            onClick={() => navigate("about")}
          >
            About &amp; FAQ
          </button>
        </nav>

        {view === "overview" && <ZipOverview />}
        {view === "property" && <PropertyLookup initialQuery={parseUrlState().q} onSearch={(addr) => {
          const p = new URLSearchParams(window.location.search);
          p.set("view", "property");
          p.set("q", addr);
          history.replaceState(null, "", "?" + p.toString());
        }} />}
        {view === "about" && <About />}
      </div>

      <Footer generated={meta?.generated} />
    </div>
  );
}

function Zip({ color, children }) {
  return <span className="num" style={{ color, fontWeight: 650 }}>{children}</span>;
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        // Sun icon (shown in dark mode — click for light)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon icon (shown in light mode — click for dark)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
