const SOURCES = [
  { name: "HAR / MLS", desc: "Listing history © Houston Association of REALTORS®" },
  { name: "Zillow ZHVI", desc: "Zillow Home Value Index, Zillow Research (zillow.com/research/data)" },
  { name: "Redfin", desc: "Market data © Redfin (redfin.com/news/data-center)" },
  { name: "HCAD", desc: "Public appraisal records, Harris Central Appraisal District" },
  { name: "FRED®", desc: "Macro series, Federal Reserve Bank of St. Louis" },
];

export default function Footer({ generated }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-heading">Disclaimer</div>

        <p style={{ margin: "0 0 10px" }}>
          This site is provided for general informational and educational purposes only. Nothing here
          constitutes financial, investment, legal, or tax advice, an offer to buy or sell real
          estate, or a professional appraisal or broker price opinion. Automated value indexes (such
          as the Zillow Home Value Index) and aggregated market statistics are estimates and may
          differ materially from the actual value or condition of any individual property. Consult a
          licensed real estate professional, appraiser, or financial advisor before making decisions
          based on this information.
        </p>

        <p style={{ margin: "0 0 10px" }}>
          Data is drawn from third-party and public-record sources, is provided “as is” without
          warranty of any kind, and may be incomplete, delayed, or contain errors. Property records
          reflect the public files of the Harris Central Appraisal District at the time of export and
          may not reflect current ownership, valuation, or condition.
          {generated && <> Data snapshot generated {generated.slice(0, 10)}.</>}
        </p>

        <p style={{ margin: "0 0 14px" }}>
          This site is an independent project and is not affiliated with, endorsed by, or sponsored
          by the Houston Association of REALTORS®, Zillow, Redfin, the Harris Central Appraisal
          District, or the Federal Reserve Bank of St. Louis. All trademarks are the property of
          their respective owners.
        </p>

        <div className="footer-sources">
          {SOURCES.map(({ name, desc }) => (
            <span key={name}>
              <b>{name}</b>
              {" — "}
              {desc}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
