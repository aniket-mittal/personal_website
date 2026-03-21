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
        <h2>Education</h2>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">UC Berkeley</span>
            <span className="mobile-card-sub">Expected May 2028</span>
          </div>
          <p className="mobile-card-program">M.E.T. Program — B.S. EECS + Business Administration</p>
          <p className="mobile-card-program">GPA: 3.9 / 4.0</p>
          <div className="mobile-coursework">
            <p><strong>EECS:</strong> Machine Learning, Data Structures & Algorithms, Computer Architecture, Discrete Math & Probability, Probability & Random Processes, Robotics & Control, Linear Algebra & Diff Eq, Signals & Systems, Data Science</p>
            <p><strong>Business:</strong> Financial Accounting, Business Ethics, Managing Tech Innovation, Entrepreneurship Immersion</p>
          </div>
        </div>
      </div>

      <div className="mobile-section">
        <h2>Experience</h2>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">NASA</span>
            <span className="mobile-card-sub">ML Engineer Intern · Jun–Aug 2025</span>
          </div>
          <p>Explainable AI framework for exoplanet validation, accelerating vetting 100x for 30+ researchers</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">Power My Analytics</span>
            <span className="mobile-card-sub">AI Engineer · Jan–May 2025</span>
          </div>
          <p>Built AI agents using Claude and TypeScript, reducing 500+ labor hours of engineering work</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">NASA</span>
            <span className="mobile-card-sub">AI/ML Engineer Intern · May 2023–May 2024</span>
          </div>
          <p>ML models for JWST cosmic ray classification, achieving 70% higher precision/recall. Awarded $125k Grant</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">SJSU CFD Lab</span>
            <span className="mobile-card-sub">Software Engineer · Feb 2023–Aug 2024</span>
          </div>
          <p>Fluid dynamics optimization in C++, presented at APS DFD. Granted by US Office of Naval Research</p>
        </div>
      </div>

      <div className="mobile-section">
        <h2>Projects</h2>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">CrossOdds</span>
            <span className="mobile-card-sub">Mar 2026 – Present</span>
          </div>
          <p>Prediction markets arbitrage engine — 300K+ impressions, 30 active users</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">Vero</span>
            <span className="mobile-card-sub">Nov 2025 – Present</span>
          </div>
          <p>Autonomous AI agent for dataset discovery and curation</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">Simple CPU (RICE-8)</span>
            <span className="mobile-card-sub">Nov 2025</span>
          </div>
          <p>8-bit single-cycle Harvard-architecture CPU in ~1,500 lines of Verilog</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">ImageVision</span>
            <span className="mobile-card-sub">Sep–Dec 2024</span>
          </div>
          <p>AI photo editor — SDXL, CLIP, ControlNet & SAM</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">Staging Sphere</span>
            <span className="mobile-card-sub">Dec 2024 – May 2025</span>
          </div>
          <p>AI real estate staging — outperformed GPT-4o, 5 corporate clients</p>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-header">
            <span className="mobile-card-title">FireSight</span>
            <span className="mobile-card-sub">Dec 2024 – May 2025</span>
          </div>
          <p>Wildfire detection — published in EarthArxiv, 700+ views, 2 citations</p>
        </div>
        <p className="mobile-more">…and many more on <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </div>

      <div className="mobile-section">
        <h2>Skills</h2>
        <div className="mobile-card">
          <p><strong>Languages:</strong> Python, Java, JavaScript, TypeScript, C, C++, Verilog, SQL, Assembly, CAD</p>
          <p><strong>Frameworks:</strong> REST APIs, FastAPI, Flask, Tensorflow, Pytorch, HuggingFace, LangChain, OpenCV, YOLO, SDXL, React, Next.js</p>
          <p><strong>Developer Tools:</strong> Docker, Git, AWS, Firebase, MongoDB, PostgreSQL, Pinecone, Qdrant, Supabase</p>
        </div>
      </div>

      <div className="mobile-section">
        <h2>Contact</h2>
        <div className="mobile-links-row">
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
        <span>Visit on a laptop for project details and to explore my interactive 3D world</span>
      </div>
    </div>
  )
}
