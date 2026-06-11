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
import RangeToggle, { filterRange } from "../components/RangeToggle";
import { colors, fmtCompactCurrency } from "../components/theme";

const ZIPS = ["77007", "77008", "77009"];
const ZIP_COLORS = { 77007: colors.zip77007, 77008: colors.zip77008, 77009: colors.zip77009 };

const tick = { fontSize: 11 };
const xAxisProps = { tick, tickLine: false, axisLine: false, minTickGap: 48 };
const yAxisProps = { tick, tickLine: false, axisLine: false };
const currencyAxis = { ...yAxisProps, tickFormatter: fmtCompactCurrency, width: 52 };
const gridProps = { stroke: colors.borderAlt, vertical: false };
const legendProps = { iconType: "circle", iconSize: 7 };
const lineProps = { type: "monotone", dot: false, strokeWidth: 1.8 };

function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {subtitle && <div className="panel-subtitle">{subtitle}</div>}
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
  const [range, setRange] = useState("2020");
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
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {loading && <div style={{ color: "var(--text-dim)" }}>Loading…</div>}
      {error && <div style={{ color: "var(--red)" }}>Error: {error}</div>}

      {!loading && !error && !compareMode && trend && (
        <SingleZipCharts data={filterRange(trend.series, range)} />
      )}
      {!loading && !error && compareMode && compare && <CompareCharts zips={compare.zips} range={range} />}
    </div>
  );
}

function SingleZipCharts({ data }) {
  const chartData = data.map((d) => ({ ...d, monthLabel: monthLabel(d.month) }));

  return (
    <>
      <ChartPanel title="Home value trend" subtitle="Zillow ZHVI vs. MLS median close and Redfin median sale price">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis {...currencyAxis} domain={["auto", "auto"]} />
          <Tooltip formatter={(v) => fmtCompactCurrency(v)} />
          <Legend {...legendProps} />
          <Line {...lineProps} dataKey="zhvi" name="Zillow ZHVI" stroke={colors.zip77008} />
          <Line {...lineProps} dataKey="mls_median_close_price" name="MLS Median Close" stroke={colors.zip77007} />
          <Line {...lineProps} dataKey="redfin_median_sale_price" name="Redfin Median Sale" stroke={colors.zip77009} />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Days on market" subtitle="Median days from listing to contract">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis {...yAxisProps} width={36} />
          <Tooltip />
          <Legend {...legendProps} />
          <Line {...lineProps} dataKey="mls_median_dom" name="MLS Median DOM" stroke={colors.zip77007} />
          <Line {...lineProps} dataKey="redfin_median_dom" name="Redfin Median DOM" stroke={colors.zip77009} />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Inventory" subtitle="Active listings and months of supply (Redfin)">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis yAxisId="left" {...yAxisProps} width={42} />
          <YAxis yAxisId="right" orientation="right" {...yAxisProps} width={28} />
          <Tooltip />
          <Legend {...legendProps} />
          <Line {...lineProps} yAxisId="left" dataKey="redfin_active_listings" name="Active Listings" stroke={colors.zip77008} />
          <Line {...lineProps} yAxisId="right" dataKey="redfin_months_supply" name="Months of Supply" stroke={colors.accentGold} />
        </LineChart>
      </ChartPanel>

      <ChartPanel title="New listings vs. closed sales" subtitle="Monthly counts">
        <LineChart data={chartData}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis {...yAxisProps} width={36} />
          <Tooltip />
          <Legend {...legendProps} />
          <Line {...lineProps} dataKey="redfin_new_listings" name="New Listings (Redfin)" stroke={colors.zip77007} />
          <Line {...lineProps} dataKey="mls_closed_count" name="Closed Sales (MLS)" stroke={colors.zip77009} />
        </LineChart>
      </ChartPanel>
    </>
  );
}

function CompareCharts({ zips, range }) {
  // Merge the 3 zip series into one array keyed by month for overlay charts.
  const monthsSet = new Set();
  Object.values(zips).forEach((series) => series.forEach((d) => monthsSet.add(d.month)));
  const months = filterRange(
    Array.from(monthsSet).sort().map((m) => ({ month: m })),
    range
  ).map((r) => r.month);

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
      <ChartPanel title="Home value comparison" subtitle="Zillow ZHVI by ZIP code">
        <LineChart data={merged}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis {...currencyAxis} domain={["auto", "auto"]} />
          <Tooltip formatter={(v) => fmtCompactCurrency(v)} />
          <Legend {...legendProps} />
          {ZIPS.map((z) => (
            <Line key={z} {...lineProps} dataKey={`zhvi_${z}`} name={z} stroke={ZIP_COLORS[z]} />
          ))}
        </LineChart>
      </ChartPanel>

      <ChartPanel title="Sale price comparison" subtitle="Redfin median sale price by ZIP code">
        <LineChart data={merged}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="monthLabel" {...xAxisProps} />
          <YAxis {...currencyAxis} domain={["auto", "auto"]} />
          <Tooltip formatter={(v) => fmtCompactCurrency(v)} />
          <Legend {...legendProps} />
          {ZIPS.map((z) => (
            <Line key={z} {...lineProps} dataKey={`redfin_price_${z}`} name={z} stroke={ZIP_COLORS[z]} />
          ))}
        </LineChart>
      </ChartPanel>
    </>
  );
}
