export const RANGES = [
  { id: "2020", label: "Since 2020" },
  { id: "10y", label: "10Y" },
  { id: "max", label: "Max" },
];

export const rangeCutoff = (id) => {
  if (id === "2020") return "2020-01";
  if (id === "10y") {
    const d = new Date();
    return `${d.getFullYear() - 10}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
};

export const filterRange = (rows, id, key = "month") => {
  const cutoff = rangeCutoff(id);
  if (!cutoff) return rows;
  return rows.filter((r) => r[key] >= cutoff);
};
