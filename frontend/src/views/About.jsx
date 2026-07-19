import Collapsible from "../components/Collapsible";

export default function About() {
  return (
    <div>
      <div className="panel">
        <div className="panel-title">About Heights Comps</div>
        <p className="text-block">
          Heights Comps is a free, independent reference tool for home values and market trends in
          Houston Heights, Rice Military, and Near Northside (ZIP codes 77007, 77008, and 77009).
          It's built and maintained by a local resident — not a brokerage or agent — using public data
          sources, and is updated roughly once per quarter.
        </p>
        <p className="text-block">
          We are not real estate agents or appraisers, and nothing on this site is an offer, an
          appraisal, or a substitute for a comparative market analysis (CMA) from a licensed
          professional. Use it as a starting point for understanding your neighborhood's market —
          not as the final word on what a specific home is worth.
        </p>
      </div>

      <div className="panel">
        <div className="panel-title">How the value estimate works</div>
        <p className="text-block">
          Each property's estimated value range is built from recent comparable sales ("comps") —
          other homes that sold nearby with a similar size, lot size, and age:
        </p>
        <ol className="text-list">
          <li>
            <strong>Find comps.</strong> We start with MLS sales in the same ZIP code, within roughly
            ±25% of the subject home's square footage, that closed within the last 12 months.
          </li>
          <li>
            <strong>Match lot size and age when possible.</strong> Small-lot townhomes/patio homes and
            large-lot single-family homes sell at very different prices per square foot, even on the
            same street. When there are enough comps (5+), we narrow to homes with a similar lot size
            (±40%) and, where possible, a similar year built (±25 years), so the comparison is closer
            to apples-to-apples.
          </li>
          <li>
            <strong>Adjust for the current market.</strong> Each comp's sale price per square foot is
            time-adjusted to today using a quarterly price index built separately for townhomes
            (lots under 3,000 sq ft) and single-family homes in that ZIP. The two segments can move
            in opposite directions — a ZIP-wide index would miss that — so each comp is scaled by
            its own segment's trend. Brand-new construction is excluded from both the comps and the
            index, since it sells at a premium over existing homes.
          </li>
          <li>
            <strong>Compute a range.</strong> The "low / mid / high" estimate is the 25th / 50th / 75th
            percentile of the adjusted price-per-square-foot across the comp set, multiplied by the
            subject home's square footage.
          </li>
        </ol>
        <p className="text-block">
          This is a statistical estimate, similar in spirit to a Zillow "Zestimate" — it reflects
          recent comparable sales, not the specific condition, updates, or finishes of an individual
          home. Two homes on the same street with the same square footage can be worth very different
          amounts depending on renovations, layout, and condition, which this tool can't see.
        </p>
      </div>

      <div className="panel">
        <div className="panel-title">Data sources</div>
        <ul className="text-list">
          <li><strong>HCAD</strong> — Harris County Appraisal District property records (size, lot, year built, assessed value).</li>
          <li><strong>MLS (HAR)</strong> — recent listing and sale history for comps.</li>
          <li><strong>Zillow ZHVI</strong> — home value index trends shown on the Market Overview tab.</li>
          <li><strong>Redfin &amp; FRED</strong> — broader market and macro context shown on the Market Overview tab.</li>
        </ul>
      </div>

      <Collapsible title="Frequently asked questions" defaultOpen>
        <div className="faq-item">
          <div className="faq-q">Is this an appraisal or a Zestimate?</div>
          <p className="text-block">
            No. It's a comps-based estimate computed from public data, refreshed roughly quarterly. It's
            meant to give you a reasonable, explainable range — not a guaranteed valuation. For an
            official valuation, talk to a licensed appraiser or a local real estate agent who can do a
            full CMA.
          </p>
        </div>
        <div className="faq-item">
          <div className="faq-q">Why does my home's estimate seem too high or too low?</div>
          <p className="text-block">
            The estimate is driven entirely by recent comparable sales — it doesn't know about your
            home's specific renovations, condition, or unique features. It's also a point-in-time
            snapshot: if the market has shifted quickly (e.g., a sudden increase in inventory or a
            slowdown in showings), the most recent few months of sales may lag what's happening right
            now.
          </p>
        </div>
        <div className="faq-item">
          <div className="faq-q">How often is the data updated?</div>
          <p className="text-block">
            Roughly once a month or once a quarter. Check the "Snapshot" date shown near the top of the
            site for when the underlying data was last refreshed.
          </p>
        </div>
        <div className="faq-item">
          <div className="faq-q">Which areas does this cover?</div>
          <p className="text-block">
            Houston Heights, Rice Military, and Near Northside — ZIP codes 77007, 77008, and 77009.
          </p>
        </div>
        <div className="faq-item">
          <div className="faq-q">Who runs this site / is my data sold to anyone?</div>
          <p className="text-block">
            Heights Comps is run by a local resident as a community resource. We don't collect leads,
            sell data, or share information with agents or brokers. Aggregate, anonymous usage
            analytics (page views) help us understand what's useful.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
