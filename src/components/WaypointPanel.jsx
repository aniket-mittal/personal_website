import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Lightbox from './Lightbox'
import ArbitrageExplainer from './ArbitrageExplainer'

/* ─── Media arrays for lightbox ─── */
const SKIING_MEDIA = [
  { type: 'image', src: '/skiing-1.jpg', alt: 'Base lodge at the mountain' },
  { type: 'image', src: '/skiing-2.jpg', alt: 'Sunset drive through the mountains' },
]

const CARS_MEDIA = [
  { type: 'image', src: '/cars-pagani-huayra.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-pagani-interior.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-pagani-engine.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-ferrari-sf90.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-koenigsegg.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-mclaren-senna.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-aston-db11.jpg', alt: 'Car at Monterey Car Week' },
  { type: 'image', src: '/cars-lamborghini-aventador.jpg', alt: 'Car at Monterey Car Week' },
]

const KARATE_MEDIA = [
  { type: 'image', src: '/karate.jpg', alt: 'Young Aniket with a karate medal' },
]

const GOLF_MEDIA = [
  { type: 'video', src: '/golf-demo.mp4' },
]

/* ─── Resume data ─── */
const experience = [
  {
    role: 'ML Engineer Intern', subtitle: 'Explainable AI', company: 'NASA', period: 'Jun 2025 – Aug 2025',
    bullets: [
      'Developed an end-to-end explainable AI framework for exoplanet validation in Tensorflow, validating 300+ new exoplanets & accelerating vetting 100x for 30+ researchers.',
      'Balanced latency & accuracy by introducing multi-head attention modules, conducting 15+ experiments evaluating traditional explainable AI approaches (SHAP, LIME).',
    ],
  },
  {
    role: 'AI Engineer', subtitle: 'AI Agents', company: 'Power My Analytics', period: 'Jan 2025 – May 2025',
    bullets: [
      'Built an AI agent using Claude and TypeScript to automate connector development, reducing manual engineering work by 500+ labor hours (~3 months).',
      'Presented solution directly to the CEO & Head of AI. Pipeline deployed as part of core development workflow.',
    ],
  },
  {
    role: 'AI/ML Engineer Intern', subtitle: 'Computer Vision', company: 'NASA', period: 'May 2023 – May 2024',
    bullets: [
      'Independently engineered novel ML models (U-Net, CNNs) in Tensorflow to classify cosmic rays for the James Webb Space Telescope, achieving 70% higher precision/recall. Research awarded the Ames CIF $125k Grant.',
      'Built a full-stack application in Python, JavaScript, SQLite & HTML for ML-assisted data labeling (10x faster). Grew to 30 users & 50k+ visits.',
    ],
  },
  {
    role: 'Software Engineer', subtitle: 'Gradient Descent', company: 'San Jose State University CFD Lab', period: 'Feb 2023 – Aug 2024',
    bullets: [
      'Identified optimal propulsive gaits for fish-like swimming by integrating the Immersed Boundary Projection Method and Adjoint Method in C++, reducing computation time by 1M×.',
      'Presented at the 76th American Physical Society DFD Conference. Project granted by US Office of Naval Research.',
    ],
  },
]

const education = {
  school: 'UC Berkeley',
  program: 'Management, Entrepreneurship & Technology Program',
  degrees: 'B.S. EECS + Business Administration',
  gpa: '3.9 / 4.0',
  period: '',
  eecsCourses: ['Machine Learning', 'Data Structures & Algorithms', 'Computer Architecture', 'Discrete Math & Probability', 'Probability & Random Processes', 'Robotics & Control', 'Linear Algebra & Diff Eq', 'Signals & Systems', 'Data Science'],
  businessCourses: ['Financial Accounting', 'Business Ethics', 'Managing Tech Innovation', 'Entrepreneurship Immersion'],
}

const skills = {
  'Languages': 'Python, Java, JavaScript, TypeScript, C, C++, Verilog, SQL, Assembly, CAD',
  'Frameworks': 'REST APIs, FastAPI, Flask, Tensorflow, Pytorch, HuggingFace, LangChain, OpenCV, YOLO, SDXL, React, Next.js',
  'Developer Tools': 'Docker, Git, AWS, Firebase, MongoDB, PostgreSQL, Pinecone, Qdrant, Supabase',
}

/* ─── Projects data ─── */
const worldProjects = [
  {
    title: 'CrossOdds',
    description: 'Real-time arbitrage scanner for prediction markets. Automatically identifies guaranteed-profit opportunities across Kalshi and Polymarket using AI-powered market matching.',
    videoUrl: '/crossodds-demo.mp4',
    arbitrageExplainer: true,
    sections: [
      { heading: 'How It Works', content: ['CrossOdds runs a 12-step pipeline to find arbitrage: it discovers markets across Kalshi and Polymarket, generates semantic embeddings for each market question, then uses cosine similarity search to find candidate pairs that resolve to the same real-world event.', 'Candidates pass through structural filters (volume, liquidity, order book availability), a multi-signal quality gate (embedding similarity 60% + keyword Jaccard 25% + parent event alignment 15%), and LLM confirmation via Gemini 2.0 Flash that validates resolution criteria match.', 'For confirmed pairs, it calculates net spreads after Kalshi taker fees and Polymarket slippage. High-spread pairs (>8%) get a second adversarial LLM pass to catch false positives.'] },
      { heading: 'Intelligent Filtering', content: ['The engine evaluates ~6,500 Kalshi × 35,000 Polymarket market pairs, narrowing millions of combinations down to a handful of high-confidence opportunities through progressive filtering.', 'The LLM is trained to detect common false positives: multi-outcome vs specific sub-outcomes, different thresholds or dates, different scope (US vs global), and winner vs draw in competitions.'] },
      { heading: 'Metrics', content: ['300K+ impressions on social media · 30 active users · 1,000+ website views'] },
    ],
    tags: ['TypeScript', 'Next.js', 'PostgreSQL', 'pgvector', 'Gemini', 'Hono'],
    link: 'https://www.crossodds.app/',
    social: 'https://x.com/crossodds28',
    date: 'Mar 2026 – Present',
  },
  {
    title: 'Vero',
    description: 'Autonomous AI agent that discovers, downloads, analyzes, curates, and combines datasets from multiple providers, all through natural language.',
    videoUrl: '/vero-demo.mp4',
    github: 'https://github.com/aniket-mittal',
    sections: [
      { heading: 'Persistent Sandbox', content: ['Vero runs code in a Jupyter-style Python sandbox where variables persist across every execution step. The sandbox comes pre-loaded with pandas, numpy, scikit-learn, matplotlib, seaborn, and more.'] },
      { heading: 'Tool System', content: ['The agent has tools for searching datasets across Kaggle, HuggingFace, and government portals, downloading and extracting files, running Python code, and combining multiple sources into unified datasets.'] },
      { heading: 'Memory & Context', content: ['A variable tracker automatically summarizes the active workspace (shapes, dtypes, memory usage) and injects it into the agent\'s context so it always knows what data it\'s working with.'] },
    ],
    tags: ['Python', 'Claude', 'Jupyter', 'Tool Use'],
    date: 'Nov 2025 – Present',
  },
  {
    title: 'Simple CPU (RICE-8)',
    description: '8-bit single-cycle Harvard-architecture CPU designed from scratch in ~1,500 lines of Verilog.',
    github: 'https://github.com/aniket-mittal',
    images: [{ src: '/rice8-architecture.svg', caption: 'RICE-8 CPU datapath' }],
    sections: [
      { heading: 'Architecture', content: ['Single-cycle CPU with separate instruction (256×16 ROM) and data (256×8 RAM) memory spaces. All pipeline stages complete in one clock period.'] },
      { heading: 'Instruction Set', content: ['Fixed 16-bit encoding with R-type, I-type, and J-type formats. 16 instructions total including arithmetic, logic, memory, and branch operations.'] },
    ],
    tags: ['Verilog', 'Computer Architecture'],
    date: 'Nov 2025',
  },
  {
    title: 'ImageVision',
    description: 'AI photo editor combining SDXL, CLIP, ControlNet & SAM for intelligent image editing.',
    videoUrl: '/imagevision-demo.mp4',
    github: 'https://github.com/aniket-mittal/image_vision',
    sections: [
      { heading: 'Architecture', content: ['Multi-model pipeline: SAM for segmentation, CLIP for understanding, SDXL for generation, and ControlNet for structural guidance.'] },
    ],
    tags: ['Python', 'SDXL', 'CLIP', 'SAM', 'ControlNet'],
    date: 'Sep 2024 – Dec 2024',
  },
  {
    title: 'Staging Sphere',
    description: 'AI real estate staging: transforms empty rooms into furnished spaces using semantic segmentation and stable diffusion. 5 corporate clients.',
    videoUrl: '/stagingsphere-demo.mp4',
    github: 'https://github.com/aniket-mittal/real_estate_app',
    sections: [
      { heading: 'AI Pipeline', content: ['Semantic segmentation identifies placeable regions, then SDXL inpainting generates photorealistic furniture matched to room geometry. 31 room types and 22 design styles.'] },
      { heading: 'Traction', content: ['1,000+ visits and 5 corporate clients.'] },
    ],
    tags: ['AWS', 'Flask', 'Stable Diffusion', 'PostgreSQL'],
    date: 'Dec 2024 – May 2025',
  },
  {
    title: 'FireSight',
    description: 'Deep learning wildfire detection system. Published in EarthArxiv with 700+ views and 2 citations.',
    github: 'https://github.com/aniket-mittal/firesight',
    paper: 'https://eartharxiv.org/repository/view/5972/',
    images: [
      { src: '/firesight-prediction.png', caption: 'Fire spread prediction from 12 environmental channels' },
      { src: '/firesight-spread.png', caption: 'Temporal fire spread progression over 7 time steps' },
    ],
    sections: [
      { heading: 'Model', content: ['Compares 8 architectures across 6 metrics. Each outputs a 64×64 probabilistic fire mask predicting the next time step.'] },
    ],
    tags: ['Tensorflow', 'Computer Vision', 'Python'],
    date: 'Dec 2024 – May 2025',
  },
]

/* ─── Panel content definitions ─── */
const PANEL_CONTENT = {
  origin: {
    title: "Hi, I'm Aniket Mittal",
    subtitle: 'EECS + Business at UC Berkeley',
    layout: 'side',
    body: () => (
      <>
        <p className="wp-panel-desc">
          I'm a student at UC Berkeley studying Electrical Engineering & Computer Science
          and Business Administration. I build things I genuinely want to see in the world.
        </p>
        <div className="wp-panel-section">
          <h3>Currently</h3>
          <ul>
            <li>Building proactive intelligence at <a href="https://www.callaunchpad.org/" target="_blank" rel="noopener noreferrer">Cal Launchpad</a></li>
            <li>Building a prediction markets arbitrage engine at <a href="https://www.crossodds.app/" target="_blank" rel="noopener noreferrer">CrossOdds</a> (<a href="https://x.com/crossodds28" target="_blank" rel="noopener noreferrer">@crossodds28</a>)</li>
            <li>Working with researchers at <a href="https://slice.eecs.berkeley.edu/" target="_blank" rel="noopener noreferrer">SLICE Lab</a> on AI for hardware projects</li>
          </ul>
        </div>
        <div className="wp-panel-section">
          <h3>Previously</h3>
          <ul>
            <li>ML Engineer at NASA: explainable AI for exoplanets & computer vision for JWST</li>
            <li>Software Engineer at SJSU CFD Lab: fluid dynamics in C++, presented at APS DFD</li>
            <li>Staging Sphere: AI real estate staging, outperformed GPT-4o, 5 corporate clients</li>
            <li>FireSight: wildfire detection system, published in EarthArxiv, 2 citations</li>
            <li>ImageVision: AI photo editor with SDXL, CLIP, ControlNet & SAM</li>
          </ul>
        </div>
        <div className="wp-panel-section">
          <h3>Contact</h3>
          <div className="wp-panel-contact-icons">
            <a href="mailto:aniket_mittal@berkeley.edu" title="Email">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
              </svg>
            </a>
            <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/aniketm/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a href="https://x.com/ampm2624" target="_blank" rel="noopener noreferrer" title="X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
        <p className="wp-panel-cta">Click around or use the compass to explore my world.</p>
      </>
    ),
  },
  resume: {
    title: 'Resume',
    subtitle: null,
    layout: 'center',
    body: () => (
      <div className="wp-center-resume">
        <section className="resume-section">
          <h3>Education</h3>
          <div className="resume-card">
            <div className="resume-card-header">
              <h4>{education.school}</h4>
              <span className="resume-date">{education.period}</span>
            </div>
            <p className="resume-subtitle">{education.program}</p>
            <p className="resume-detail">{education.degrees} &nbsp;·&nbsp; GPA: {education.gpa}</p>
            <div className="resume-coursework">
              <p><strong>EECS:</strong> {education.eecsCourses.join(', ')}</p>
              <p><strong>Business:</strong> {education.businessCourses.join(', ')}</p>
            </div>
          </div>
        </section>

        <section className="resume-section">
          <h3>Experience</h3>
          {experience.map((exp, i) => (
            <div key={i} className="resume-card">
              <div className="resume-card-header">
                <h4>{exp.role}</h4>
                <span className="resume-date">{exp.period}</span>
              </div>
              <p className="resume-subtitle">{exp.company} · {exp.subtitle}</p>
              <ul className="resume-bullets">
                {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className="resume-section">
          <h3>Patents & Inventions</h3>
          <div className="resume-card">
            <p className="resume-detail">Accumulated 10+ provisional patents for inventions spanning AI-powered security camera systems, intelligent AI-based sprinkler controllers, water conservation drones, and other applied AI hardware-software solutions.</p>
          </div>
        </section>

        <section className="resume-section">
          <h3>Skills</h3>
          <div className="skills-grid">
            {Object.entries(skills).map(([cat, list]) => (
              <div key={cat} className="skill-category">
                <h4>{cat}</h4>
                <p>{list}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    ),
  },
  projects: {
    title: 'Projects',
    subtitle: null,
    layout: 'center',
    body: 'projects-explorer',
  },
  skiing: {
    title: 'Skiing',
    subtitle: null,
    layout: 'side',
    body: ({ onOpen }) => (
      <>
        <p className="wp-panel-desc">
          Still learning, but I hit my first black diamond in January 2026 and somehow made it down in one piece.
          I've been having a lot of fun learning and slowly but surely getting better.
        </p>
        <div className="wp-panel-gallery">
          <div className="wp-panel-gallery-item" onClick={() => onOpen(SKIING_MEDIA, 0)}>
            <img src="/skiing-1.jpg" alt="Base lodge at the mountain" />
            <span>Base Lodge</span>
          </div>
          <div className="wp-panel-gallery-item" onClick={() => onOpen(SKIING_MEDIA, 1)}>
            <img src="/skiing-2.jpg" alt="Sunset drive through the mountains" />
            <span>Mountain Sunset</span>
          </div>
        </div>
      </>
    ),
  },
  cars: {
    title: 'Cars',
    subtitle: 'Monterey Car Week 2025',
    layout: 'side',
    body: ({ onOpen }) => (
      <>
        <p className="wp-panel-desc">
          Aspiring car enthusiast. I love the engineering and design but still can't remember half the names.
          Here are some of the cars I saw at Monterey Car Week.
        </p>
        <div className="wp-panel-gallery">
          {CARS_MEDIA.map((item, i) => (
            <div className="wp-panel-gallery-item" key={i} onClick={() => onOpen(CARS_MEDIA, i)}>
              <img src={item.src} alt={item.alt} />
            </div>
          ))}
        </div>
      </>
    ),
  },
  karate: {
    title: 'Karate',
    subtitle: null,
    layout: 'side',
    body: ({ onOpen }) => (
      <>
        <p className="wp-panel-desc">
          I trained in karate for 10 years and taught for over 6. Probably the most fun experience of my life.
          I competed internationally and it taught me so much about teamwork and discipline.
        </p>
        <div className="wp-panel-gallery">
          <div className="wp-panel-gallery-item wp-panel-gallery-single" onClick={() => onOpen(KARATE_MEDIA, 0)}>
            <img src="/karate.jpg" alt="Young Aniket with a karate medal" />
            <span>A much younger me after a tournament</span>
          </div>
        </div>
      </>
    ),
  },
  golf: {
    title: 'Golf',
    subtitle: null,
    layout: 'side',
    body: ({ onOpen }) => (
      <>
        <p className="wp-panel-desc">
          Still learning. Not every shot is pretty, but that's part of it.
        </p>
        <div className="wp-panel-video" onClick={() => onOpen(GOLF_MEDIA, 0)}>
          <video src="/golf-demo.mp4" autoPlay loop muted playsInline />
        </div>
      </>
    ),
  },
}

/* ─── Projects Explorer (inline in center panel) ─── */
function ProjectsExplorer() {
  const [activeIdx, setActiveIdx] = useState(0)
  const detailRef = useRef(null)
  const active = worldProjects[activeIdx]

  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0
  }, [activeIdx])

  return (
    <div className="projects-explorer">
      <div className="projects-sidebar">
        <div className="projects-sidebar-list">
          {worldProjects.map((p, i) => (
            <button
              key={i}
              className={`projects-sidebar-item${i === activeIdx ? ' active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <span className="projects-sidebar-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="projects-sidebar-text">
                <span className="projects-sidebar-title">{p.title}</span>
                <span className="projects-sidebar-date">{p.date}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="projects-detail" ref={detailRef} key={activeIdx}>
        <div className="projects-detail-header">
          <div>
            <h2>{active.title}</h2>
            <span className="projects-detail-date">{active.date}</span>
          </div>
          {(active.link || active.social || active.github || active.paper) && (
            <div className="projects-detail-links">
              {active.link && <a href={active.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Live Site</a>}
              {active.social && <a href={active.social} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">𝕏</a>}
              {active.github && <a href={active.github} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">GitHub</a>}
              {active.paper && <a href={active.paper} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Paper</a>}
            </div>
          )}
        </div>
        <div className="project-tags">
          {active.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
        <p className="projects-detail-desc">{active.description}</p>
        {(active.videoUrl || active.images) && (
          <div className="projects-detail-media">
            {active.videoUrl && <video src={active.videoUrl} controls playsInline className="projects-detail-video" />}
            {active.images && active.images.map((img, i) => (
              <figure key={i} className="projects-detail-figure">
                <img src={img.src} alt={img.caption || ''} />
                {img.caption && <figcaption>{img.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        {active.arbitrageExplainer && <ArbitrageExplainer />}
        {active.sections && active.sections.map((section, i) => (
          <div key={i} className="projects-detail-section">
            <h3>{section.heading}</h3>
            {section.content.map((paragraph, j) => <p key={j}>{paragraph}</p>)}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function WaypointPanel({ waypointId, onClose }) {
  const content = PANEL_CONTENT[waypointId]
  const [lightbox, setLightbox] = useState(null)

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!content) return null

  const isCentered = content.layout === 'center'
  const isProjectsExplorer = content.body === 'projects-explorer'
  const Body = typeof content.body === 'function' ? content.body : null
  const openLightbox = (items, startIndex) => setLightbox({ items, startIndex })

  if (isCentered) {
    return (
      <>
        <div className="wp-center-overlay" onClick={onClose}>
          <div className={`wp-center-panel ${isProjectsExplorer ? 'wp-center-panel--wide' : ''}`} onClick={e => e.stopPropagation()}>
            <button className="wp-panel-close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h2>{content.title}</h2>
            {content.subtitle && <p className="wp-panel-subtitle">{content.subtitle}</p>}
            <div className="wp-center-body">
              {isProjectsExplorer ? (
                <>
                  <ProjectsExplorer />
                  <p className="projects-more">…and many more on <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer">GitHub</a></p>
                </>
              ) : (
                Body && <Body onOpen={openLightbox} />
              )}
            </div>
          </div>
        </div>
        {lightbox && (
          <Lightbox
            items={lightbox.items}
            startIndex={lightbox.startIndex}
            onClose={() => setLightbox(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="wp-panel">
        <button className="wp-panel-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2>{content.title}</h2>
        {content.subtitle && <p className="wp-panel-subtitle">{content.subtitle}</p>}
        <div className="wp-panel-body">
          {Body && <Body onOpen={openLightbox} />}
        </div>
      </div>
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
