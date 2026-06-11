import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getMarketCompare, getMarketTrend } from "../api";
import { colors } from "../components/theme";

const ZIPS = ["77007", "77008", "77009"];
const ZIP_COLORS = { 77007: colors.zip77007, 77008: colors.zip77008, 77009: colors.zip77009 };

const tickStyle = { fontSize: 11, fill: colors.textDim, fontFamily: "monospace" };
const legendStyle = { fontSize: 11, fontFamily: "var(--mono)" };

function ChartPanel({ title, children }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function monthLabel(m) {
  return m.slice(0, 7);
}

export default function ZipOverview() {
  const [zip, setZip] = useState("77008");
  const [compareMode, setCompareMode] = useState(false);
  const [trend, setTrend] = useState(null);
  const [compare, setCompare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (compareMode) {
      getMarketCompare()
        .then(setCompare)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      getMarketTrend(zip)
        .then(setTrend)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [zip, compareMode]);

  return (
    <div>
      <div className="btn-row" role="tablist" aria-label="ZIP code">
        {ZIPS.map((z) => (
          <button
            key={z}
            role="tab"
            aria-selected={!compareMode && zip === z}
            className={`btn${!compareMode && zip === z ? " is-active" : ""}`}
            style={{ "--active-color": ZIP_COLORS[z] }}
            onClick={() => {
              setZip(z);
              setCompareMode(false);
            }}
          >
            {z}
          </button>
        ))}
        <button
          role="tab"
          aria-selected={compareMode}
          className={`btn${compareMode ? " is-active" : ""}`}
          onClick={() => setCompareMode(true)}
        >
          Compare All
        </button>
      </div>

      {loading && <div style={{ color: "var(--text-dim)", fontFamily: "var(--mono)" }}>Loading…</div>}
      {error && <div style={{ color: "var(--red)", fontFamily: "var(--mono)" }}>Error: {error}</div>}

      {!loading && !error && !compareMode && trend && <SingleZipCharts data={trend.series} />}
      {!loading && !error && compareMode && compare && <CompareCharts zips={compare.zips} />}
    </div>
  );
}

function SingleZipCharts({ data }) {
  const chartData = data.map((d) => ({ ...d, monthLabel: monthLabel(d.month) }));

  return (
    <>
      <ChartPanel title="Home Value Trend (ZHVI, MLS Close Price, Redfin Median Sale)">
        <LineChart data={chartData}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} domain={["auto", "auto"]} width={64} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="zhvi" name="Zillow ZHVI" stroke={colors.zip77008} dot={false} />
          <Line
            type="monotone"
            dataKey="mls_median_close_price"
            name="MLS Median Close"
            stroke={colors.zip77007}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="redfin_median_sale_price"
            name="Redfin Median Sale"
            stroke={colors.zip77009}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Days on Market">
        <LineChart data={chartData}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="mls_median_dom" name="MLS Median DOM" stroke={colors.zip77007} dot={false} />
          <Line
            type="monotone"
            dataKey="redfin_median_dom"
            name="Redfin Median DOM"
            stroke={colors.zip77009}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Inventory: Active Listings & Months of Supply (Redfin)">
        <LineChart data={chartData}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis yAxisId="left" tick={tickStyle} width={44} />
          <YAxis yAxisId="right" orientation="right" tick={tickStyle} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="redfin_active_listings"
            name="Active Listings"
            stroke={colors.zip77008}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="redfin_months_supply"
            name="Months of Supply"
            stroke={colors.accentGold}
            dot={false}
          />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="New Listings vs. Closed Sales (Monthly)">
        <LineChart data={chartData}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line
            type="monotone"
            dataKey="redfin_new_listings"
            name="New Listings (Redfin)"
            stroke={colors.zip77007}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="mls_closed_count"
            name="Closed Sales (MLS)"
            stroke={colors.zip77009}
            dot={false}
          />
        </LineChart>
      </ChartPanel>
    </>
  );
}

function CompareCharts({ zips }) {
  // Merge the 3 zip series into one array keyed by month for overlay charts.
  const monthsSet = new Set();
  Object.values(zips).forEach((series) => series.forEach((d) => monthsSet.add(d.month)));
  const months = Array.from(monthsSet).sort();

  const merged = months.map((month) => {
    const row = { month, monthLabel: monthLabel(month) };
    for (const z of ZIPS) {
      const point = zips[z]?.find((d) => d.month === month);
      row[`zhvi_${z}`] = point?.zhvi ?? null;
      row[`redfin_price_${z}`] = point?.redfin_median_sale_price ?? null;
    }
    return row;
  });

  return (
    <>
      <ChartPanel title="Zillow ZHVI Comparison">
        <LineChart data={merged}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} domain={["auto", "auto"]} width={64} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          {ZIPS.map((z) => (
            <Line key={z} type="monotone" dataKey={`zhvi_${z}`} name={z} stroke={ZIP_COLORS[z]} dot={false} />
          ))}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Redfin Median Sale Price Comparison">
        <LineChart data={merged}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} domain={["auto", "auto"]} width={64} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          {ZIPS.map((z) => (
            <Line
              key={z}
              type="monotone"
              dataKey={`redfin_price_${z}`}
              name={z}
              stroke={ZIP_COLORS[z]}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartPanel>
    </>
  );
}

const tooltipStyle = {
  background: colors.panelAlt,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "var(--mono)",
};
