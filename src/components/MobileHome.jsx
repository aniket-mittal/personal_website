export default function MobileHome() {
  return (
    <div className="mobile-home">
      <div className="mobile-hero">
        <p className="mobile-greeting">Hi, I'm</p>
        <h1 className="mobile-name">Aniket Mittal</h1>
        <p className="mobile-tagline">EECS + Business at UC Berkeley</p>
        <p className="mobile-desc">I build things I genuinely want to see in the world.</p>
      </div>

      <div className="mobile-section">
        <h2>Currently</h2>
        <ul>
          <li>Building proactive intelligence at <a href="https://www.callaunchpad.org/" target="_blank" rel="noopener noreferrer">Cal Launchpad</a></li>
          <li>Building a prediction markets arbitrage engine at <a href="https://www.crossodds.app/" target="_blank" rel="noopener noreferrer">CrossOdds</a></li>
          <li>Working with researchers at <a href="https://slice.eecs.berkeley.edu/" target="_blank" rel="noopener noreferrer">SLICE Lab</a> on AI for hardware</li>
        </ul>
      </div>

      <div className="mobile-section">
        <h2>Experience</h2>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">NASA</span>
            <span className="mobile-card-sub">ML Engineer Intern</span>
          </div>
          <p>Explainable AI for exoplanets & computer vision for JWST</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">Power My Analytics</span>
            <span className="mobile-card-sub">AI Engineer</span>
          </div>
          <p>Built AI agents reducing 500+ labor hours of engineering work</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">SJSU CFD Lab</span>
            <span className="mobile-card-sub">Software Engineer</span>
          </div>
          <p>Fluid dynamics optimization in C++, presented at APS DFD</p>
        </div>
      </div>

      <div className="mobile-section">
        <h2>Projects</h2>
        <div className="mobile-card">
          <span className="mobile-card-title">CrossOdds</span>
          <p>Prediction markets arbitrage engine — 300K+ impressions, 30 active users</p>
        </div>
        <div className="mobile-card">
          <span className="mobile-card-title">Vero</span>
          <p>Autonomous AI agent for dataset discovery and curation</p>
        </div>
        <div className="mobile-card">
          <span className="mobile-card-title">Staging Sphere</span>
          <p>AI real estate staging — outperformed GPT-4o, 5 corporate clients</p>
        </div>
        <div className="mobile-card">
          <span className="mobile-card-title">FireSight</span>
          <p>Wildfire detection — published in EarthArxiv, 2 citations</p>
        </div>
        <a href="/projects" className="mobile-link">View All Projects</a>
      </div>

      <div className="mobile-section">
        <h2>Links</h2>
        <div className="mobile-links-row">
          <a href="/resume">Resume</a>
          <a href="mailto:aniket_mittal@berkeley.edu">Email</a>
          <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://www.linkedin.com/in/aniketm/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://x.com/ampm2624" target="_blank" rel="noopener noreferrer">X</a>
        </div>
      </div>

      <div className="mobile-desktop-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>Visit on a laptop to explore my interactive 3D world</span>
      </div>
    </div>
  )
}
