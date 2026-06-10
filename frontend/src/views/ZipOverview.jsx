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

function ChartPanel({ title, children }) {
  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.textDimmer,
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {children}
      </ResponsiveContainer>
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
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {ZIPS.map((z) => (
          <button
            key={z}
            onClick={() => {
              setZip(z);
              setCompareMode(false);
            }}
            style={tabStyle(!compareMode && zip === z, ZIP_COLORS[z])}
          >
            {z}
          </button>
        ))}
        <button onClick={() => setCompareMode(true)} style={tabStyle(compareMode, colors.accentGold)}>
          Compare All
        </button>
      </div>

      {loading && <div style={{ color: colors.textDim, fontFamily: "monospace" }}>Loading…</div>}
      {error && <div style={{ color: colors.zip77009, fontFamily: "monospace" }}>Error: {error}</div>}

      {!loading && !error && !compareMode && trend && <SingleZipCharts data={trend.series} />}
      {!loading && !error && compareMode && compare && <CompareCharts zips={compare.zips} />}
    </div>
  );
}

function tabStyle(active, color) {
  return {
    background: active ? color + "22" : "transparent",
    border: `1px solid ${active ? color + "88" : colors.border}`,
    color: active ? color : colors.textDim,
    borderRadius: 6,
    padding: "6px 16px",
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function SingleZipCharts({ data }) {
  const chartData = data.map((d) => ({ ...d, monthLabel: monthLabel(d.month) }));

  return (
    <>
      <ChartPanel title="Home Value Trend (ZHVI, MLS Close Price, Redfin Median Sale)">
        <LineChart data={chartData}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} domain={["auto", "auto"]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
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
          <YAxis tick={tickStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
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
          <YAxis yAxisId="left" tick={tickStyle} />
          <YAxis yAxisId="right" orientation="right" tick={tickStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
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
          <YAxis tick={tickStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
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
          <YAxis tick={tickStyle} domain={["auto", "auto"]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          {ZIPS.map((z) => (
            <Line key={z} type="monotone" dataKey={`zhvi_${z}`} name={z} stroke={ZIP_COLORS[z]} dot={false} />
          ))}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Redfin Median Sale Price Comparison">
        <LineChart data={merged}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={tickStyle} minTickGap={40} />
          <YAxis tick={tickStyle} domain={["auto", "auto"]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
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
  fontFamily: "monospace",
};
