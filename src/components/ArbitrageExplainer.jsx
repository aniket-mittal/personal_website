export default function ArbitrageExplainer() {
  return (
    <div className="arb-explainer">
      <h3 className="arb-title">What is prediction market arbitrage?</h3>
      <p className="arb-subtitle">
        When two platforms price the same event differently, you can buy{' '}
        <strong>Yes</strong> on one and <strong>No</strong> on the other for
        less than $1 combined. One side always pays $1, and the difference is yours.
      </p>

      <div className="arb-layout">
        {/* Demo card */}
        <div className="arb-demo-card">
          <p className="arb-question">"Will the US enter a recession in 2026?"</p>

          <div className="arb-platforms">
            <div className="arb-platform arb-kalshi">
              <span className="arb-platform-badge arb-kalshi-badge">KALSHI</span>
              <p className="arb-buy-label">Buy</p>
              <div className="arb-price-row">
                <span className="arb-side arb-yes">Yes</span>
                <span className="arb-price">42¢</span>
              </div>
            </div>
            <div className="arb-platform arb-poly">
              <span className="arb-platform-badge arb-poly-badge">POLYMARKET</span>
              <p className="arb-buy-label">Buy</p>
              <div className="arb-price-row">
                <span className="arb-side arb-no">No</span>
                <span className="arb-price">51¢</span>
              </div>
            </div>
          </div>

          <div className="arb-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>

          <div className="arb-result">
            <div className="arb-result-row">
              <div>
                <p className="arb-result-label">Total cost per pair</p>
                <p className="arb-result-value">93¢</p>
              </div>
              <div className="arb-result-divider" />
              <div className="arb-result-right">
                <p className="arb-result-label">Payout (always)</p>
                <p className="arb-result-value arb-payout">$1.00</p>
              </div>
            </div>
            <div className="arb-profit">+7¢ guaranteed per pair</div>
          </div>
        </div>

        {/* Steps */}
        <div className="arb-steps">
          <div className="arb-step">
            <div className="arb-step-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <div>
              <p className="arb-step-label">STEP 01</p>
              <h4 className="arb-step-title">We scan markets</h4>
              <p className="arb-step-desc">Continuously polls Kalshi and Polymarket for every active Yes/No market.</p>
            </div>
          </div>
          <div className="arb-step">
            <div className="arb-step-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <p className="arb-step-label">STEP 02</p>
              <h4 className="arb-step-title">We match questions</h4>
              <p className="arb-step-desc">Embedding models semantically match the same question across platforms.</p>
            </div>
          </div>
          <div className="arb-step">
            <div className="arb-step-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="arb-step-label">STEP 03</p>
              <h4 className="arb-step-title">You lock in profit</h4>
              <p className="arb-step-desc">When Yes + No costs less than $1 across platforms, the spread is yours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
