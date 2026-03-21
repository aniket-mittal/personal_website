import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import ProjectModal from '../components/ProjectModal'
import ArbitrageExplainer from '../components/ArbitrageExplainer'

const projects = [
  {
    title: 'CrossOdds',
    description: 'Real-time arbitrage scanner for prediction markets. Automatically identifies guaranteed-profit opportunities across Kalshi and Polymarket using AI-powered market matching.',
    videoUrl: '/crossodds-demo.mp4',
    arbitrageExplainer: true,
    sections: [
      {
        heading: 'How It Works',
        content: [
          'CrossOdds runs a 12-step pipeline to find arbitrage: it discovers markets across Kalshi and Polymarket, generates semantic embeddings for each market question, then uses cosine similarity search to find candidate pairs that resolve to the same real-world event.',
          'Candidates pass through structural filters (volume, liquidity, order book availability), a multi-signal quality gate (embedding similarity 60% + keyword Jaccard 25% + parent event alignment 15%), and LLM confirmation via Gemini 2.0 Flash that validates resolution criteria match.',
          'For confirmed pairs, it calculates net spreads after Kalshi taker fees and Polymarket slippage. High-spread pairs (>8%) get a second adversarial LLM pass to catch false positives.',
        ],
      },
      {
        heading: 'Intelligent Filtering',
        content: [
          'The engine evaluates ~6,500 Kalshi × 35,000 Polymarket market pairs, narrowing millions of combinations down to a handful of high-confidence opportunities through progressive filtering.',
          'The LLM is trained to detect common false positives: multi-outcome vs specific sub-outcomes, different thresholds or dates, different scope (US vs global), and winner vs draw in competitions.',
        ],
      },
      {
        heading: 'Metrics',
        content: [
          '300K+ impressions on social media · 30 active users · 1,000+ website views',
        ],
      },
    ],
    tags: ['TypeScript', 'Next.js', 'PostgreSQL', 'pgvector', 'Gemini', 'Hono'],
    link: 'https://www.crossodds.app/',
    social: 'https://x.com/crossodds28',
    date: 'Mar 2026 – Present',
  },
  {
    title: 'Vero',
    description: 'Autonomous AI agent that discovers, downloads, analyzes, curates, and combines datasets from multiple providers — all through natural language. Tell it what you need and it builds production-ready datasets.',
    videoUrl: '/vero-demo.mp4',
    github: 'https://github.com/aniket-mittal',
    sections: [
      {
        heading: 'Persistent Sandbox',
        content: [
          'Vero runs code in a Jupyter-style Python sandbox where variables persist across every execution step — just like notebook cells. The agent can iteratively explore, transform, and validate data without losing state.',
          'The sandbox comes pre-loaded with pandas, numpy, scikit-learn, matplotlib, seaborn, and more. A variable tracker automatically summarizes the active workspace (shapes, dtypes, memory usage) and injects it into the agent\'s context so it always knows what data it\'s working with.',
          'Security is enforced through restricted file I/O, blocked network modules, and read-only environment variables — keeping execution isolated per run.',
        ],
      },
      {
        heading: 'Multi-Provider Search',
        content: [
          'Vero searches HuggingFace (700K+ datasets), Kaggle, and Yahoo Finance through a unified interface. It filters by tags, language, license, size, and sorts by downloads or recency — then downloads and registers datasets automatically.',
          'License-aware filtering lets users specify personal, research, or commercial use, and Vero only surfaces datasets that match.',
        ],
      },
      {
        heading: 'Memory & Context Management',
        content: [
          'A two-layer memory system keeps the agent grounded. Short-term memory tracks downloaded datasets, discovered insights, and error-resolution pairs within a run. Semantic memory persists cross-session patterns (workflow shortcuts, data issue fixes) so the agent learns from past runs.',
          'When conversations grow long, a token-aware compaction system kicks in — masking old tool outputs at 70% utilization and dropping stale messages at 82% — keeping the agent within its context window without losing critical information.',
        ],
      },
      {
        heading: 'Autonomous Planning',
        content: [
          'The agent creates and updates a structured task plan as it works, marking subtasks as in-progress or complete. It decides when to stop on its own — there are no hard iteration limits. A loop detector catches repeated actions and nudges the agent toward a different approach.',
          'Runs can be paused (graceful SIGTERM saves full session state to disk) and resumed later, or extended with follow-up prompts that inherit the parent run\'s context.',
        ],
      },
      {
        heading: 'Data Quality Tools',
        content: [
          'Built-in profiling generates constant-size summaries (~500 tokens) even for wide DataFrames, so the agent can inspect data without blowing up its context. Quality checks detect nulls, type mismatches, and outliers automatically.',
          'Dedicated utilities handle deduplication (exact or fuzzy), class balancing, stratified train/val/test splits, and value mapping — all discoverable by the agent through a search_patterns() tool.',
        ],
      },
      {
        heading: 'Coming Soon',
        content: [
          'Expanding Vero\'s reach to more of the internet — web scraping, APIs, and real-time data feeds. Adding synthetic data generation via LLMs (structured text, tabular augmentation) and diffusion models (image generation and augmentation) to fill gaps in real-world datasets.',
        ],
      },
    ],
    tags: ['LangChain', 'Next.js', 'FastAPI', 'Supabase', 'Python', 'AI Agents'],
    date: 'Nov 2025 – Present',
  },
  {
    title: 'Simple CPU (RICE-8)',
    description: '8-bit single-cycle Harvard-architecture CPU designed from scratch in ~1,500 lines of Verilog — custom ISA, ALU, register file, and full testbench suite.',
    github: 'https://github.com/aniket-mittal',
    sections: [
      {
        heading: 'Architecture',
        content: [
          'RICE-8 is a single-cycle CPU with completely separate instruction (256×16 ROM) and data (256×8 RAM) memory spaces. All pipeline stages — fetch, decode, execute, memory access, write-back — complete in one clock period with no stalls or hazards.',
          'The module hierarchy is clean: cpu_top wires together instruction memory, a control unit, a datapath (containing the PC, register file, ALU controller, ALU, and immediate extender), and data memory.',
        ],
      },
      {
        heading: 'Instruction Set',
        content: [
          'Fixed 16-bit encoding with three formats: R-type (register-register), I-type (immediate), and J-type (jump). 16 instructions total — ADD, SUB, AND, OR, XOR, NOT, SHL, SHR, ADDI, ANDI, ORI, LW, SW, BEQ, JMP, and JAL.',
          'Arithmetic immediates use sign-extension (supporting negative offsets) while logic immediates use zero-extension (clean bitmasks). The R0 register is hardwired to zero following RISC convention, enabling clean pseudo-instructions like NOP, MOV, and LI.',
        ],
      },
      {
        heading: 'ALU & Flags',
        content: [
          '8-bit combinational ALU supporting 8 operations with four status flags: Zero, Carry, Negative, and Overflow. Uses 9-bit internal wires for ADD/SUB to capture carry-out cleanly. Overflow detection uses two\'s-complement sign-bit analysis.',
        ],
      },
      {
        heading: 'Register File & Memory',
        content: [
          '8×8-bit register file with dual asynchronous read ports and one synchronous write port. Asynchronous reads are critical for single-cycle execution — data is available immediately without waiting for a clock edge.',
          'Harvard architecture separates instruction and data address spaces entirely. Instruction memory is pure combinational ROM; data memory uses asynchronous read with synchronous write for stable timing.',
        ],
      },
      {
        heading: 'Testing & Verification',
        content: [
          'Four-tier Makefile-driven testbench system using Icarus Verilog: full CPU integration tests (9-instruction program verifying all registers and memory), ALU unit tests (25 cases covering all operations and flag edge cases), register file tests (R0 hardwired behavior, dual-port reads), and control unit tests (all 16 opcodes).',
        ],
      },
    ],
    images: [
      { src: '/rice8-architecture.svg', caption: 'RICE-8 CPU datapath — single-cycle Harvard architecture with 8-bit ALU, 8-register file, separate instruction/data memories, and full control unit.' },
    ],
    tags: ['Verilog', 'Computer Architecture'],
    date: 'Feb 2026 – Mar 2026',
  },
  {
    title: 'ImageVision Photo Editor',
    description: 'AI photo editor that combines SDXL, CLIP, ControlNet, SAM, and FBA Matting into a single pipeline — edit images and ask questions about them using natural language.',
    videoUrl: '/imagevision-demo.mp4',
    github: 'https://github.com/aniket-mittal/image_vision',
    sections: [
      {
        heading: 'Text-Guided Selection & Masking',
        content: [
          'Type what you want to select — GroundingDINO localizes objects via text prompts, then SAM (Segment Anything, ViT-H) refines bounding boxes into pixel-precise masks. No manual lasso needed.',
          'CLIP attention maps (ViT-L-14-336, layer 22) highlight query-relevant regions with spatial biasing for directional hints like "left person" or "bottom right object." Masks are enhanced via sigmoid activation and edge feathering for smooth transitions.',
        ],
      },
      {
        heading: 'Inpainting & Seamless Blending',
        content: [
          'SDXL 1.0 inpainting generates replacement content guided by text prompts and negative prompts for quality control. Optional ControlNet conditioning (Canny edge + MiDaS depth) preserves object boundaries and 3D spatial structure.',
          'A multi-stage blending pipeline ensures photorealism: Poisson seamless cloning at boundaries, distance-transform edge feathering, Laplacian pyramid blending for multi-scale detail preservation, and color matching to the surrounding context.',
        ],
      },
      {
        heading: 'Vision Q&A & Analysis',
        content: [
          'Dual-mode interface: "Ask" for analysis and "Edit" for manipulation. In Ask mode, images are preprocessed with CLIP attention or GroundedSAM segmentation highlighting, then sent to vision-language models (GPT-4o, Claude, Gemini) with context.',
          'An iterative agent loop refines queries automatically — if the initial result is unsatisfactory, it retries with different preprocessing techniques up to 20 times.',
        ],
      },
      {
        heading: 'Precision Matting & Face Parsing',
        content: [
          'FBA Matting produces pixel-accurate alpha mattes for thin structures like hair — built from coarse trimaps (foreground > 0.9, background < 0.1, unknown transition zone). BiSeNet parses faces into 19 semantic parts (skin, hair, eyes, mouth) for face-aware editing.',
        ],
      },
      {
        heading: 'GPU Model Management',
        content: [
          'Models are loaded once at startup and held in memory for instant inference. SDXL and ControlNets are lazy-loaded on first use to save ~10GB VRAM at boot. Automatic device detection (CUDA > MPS > CPU) with mixed precision (float16 on GPU) and xFormers memory-efficient attention.',
        ],
      },
    ],
    tags: ['Next.js', 'Python', 'Stable Diffusion', 'CLIP', 'SAM'],
    date: 'Jul 2025 – Aug 2025',
  },
  {
    title: 'Staging Sphere',
    description: 'AI real estate staging platform that transforms empty rooms into realistically furnished spaces using semantic segmentation and stable diffusion inpainting. Grew to 1k+ visits and 5 corporate clients.',
    videoUrl: '/stagingsphere-demo.mp4',
    github: 'https://github.com/aniket-mittal/real_estate_app',
    sections: [
      {
        heading: 'AI Staging Pipeline',
        content: [
          'Semantic segmentation identifies furniture-placeable regions — floors, walls, and open spaces — from an uploaded room photo. The segmentation mask feeds into a stable diffusion inpainting pipeline (SDXL) that generates photorealistic furniture matched to the room\'s geometry and lighting.',
          'Users choose from 31 room types and 22 design styles (Scandinavian, mid-century modern, industrial, minimalist, etc.) with additional color scheme and specialty decor controls for fine-grained customization.',
        ],
      },
      {
        heading: 'Hallucination Correction',
        content: [
          'Built a validation layer that detects and corrects common diffusion hallucinations — floating furniture, impossible shadows, scale inconsistencies, and objects bleeding through walls. This correction system outperformed GPT-4o on staging quality benchmarks.',
        ],
      },
      {
        heading: 'Full-Stack Platform',
        content: [
          'Flask backend deployed on AWS EC2 with PostgreSQL for user management and image history. Stripe-powered subscription system ($15/month for 50 images or $1.50 pay-as-you-go). Background threading for async image generation with real-time progress polling.',
          'Multi-step wizard UX: upload → style selection → room customization → confirmation → processing with estimated time. Users can download results as ZIP or browse their full staging history.',
        ],
      },
      {
        heading: 'Traction',
        content: [
          'Grew to 1,000+ visits and signed 5 corporate clients including real estate agencies.',
        ],
      },
    ],
    tags: ['AWS', 'Flask', 'Stable Diffusion', 'Semantic Segmentation', 'PostgreSQL'],
    date: 'Dec 2024 – May 2025',
  },
  {
    title: 'FireSight Wildfire Detection',
    description: 'Deep learning system that predicts wildfire spread from 12-channel environmental data and generates escape-route insights. Published in EarthArxiv with 700+ views and 2 citations.',
    github: 'https://github.com/aniket-mittal/firesight',
    paper: 'https://eartharxiv.org/repository/view/5972/',
    images: [
      { src: '/firesight-prediction.png', caption: 'Fire spread prediction — 12 environmental input channels (elevation, temperature, wind, vegetation, drought, etc.) alongside ground truth and model prediction output.' },
      { src: '/firesight-spread.png', caption: 'Temporal fire spread progression over 7 time steps, showing the expanding fire perimeter and evacuation zone.' },
    ],
    sections: [
      {
        heading: 'Multi-Modal Data Pipeline',
        content: [
          'Each sample is a 64×64×12 tensor combining meteorological data (temperature, humidity, wind speed, precipitation), vegetation indices (NDVI), drought severity (Palmer Drought Index), terrain elevation, fire behavior metrics (Energy Release Component), population density, and historical fire masks.',
          '18,545 samples loaded via TFRecord with parallel interleaving and prefetch buffering. 5-fold cross-validation ensures robust evaluation across all models.',
        ],
      },
      {
        heading: 'Model Comparison',
        content: [
          'Systematically trains and evaluates 8 architectures from scratch: ResNet50, ResNet101, EfficientNet, EfficientNetV2S, RegNetX080, VGG19, Logistic Regression, and Random Forest. Each model outputs a 64×64 probabilistic fire mask predicting the next time step.',
          'All deep learning models use Global Average Pooling → Dense layers → Sigmoid activation, trained with Adam optimizer and binary cross-entropy for 75 epochs per fold. Tracked across 6 metrics: accuracy, precision, recall, AUC, AUC-PR, and MAE.',
        ],
      },
      {
        heading: 'Fire Spread & Escape Routes',
        content: [
          'Predictions chain temporally — each output becomes input for the next step, generating multi-step fire spread animations across 7+ time steps. The expanding fire perimeter reveals safe corridors and evacuation zones.',
          'The escape route algorithm uses predicted spread maps to calculate optimal evacuation paths away from expanding fire fronts, factoring in terrain, wind direction, and road networks.',
        ],
      },
      {
        heading: 'Publication',
        content: [
          'Published in EarthArxiv with 700+ views and 2 citations. Full methodology including escape route generation detailed in the manuscript.',
        ],
      },
    ],
    tags: ['Tensorflow', 'Computer Vision', 'Data Engineering', 'Python'],
    date: 'Dec 2024 – May 2025',
  },
]

export default function Projects() {
  const { boring } = useTheme()
  const [activeIdx, setActiveIdx] = useState(0)
  const [modalProject, setModalProject] = useState(null)
  const detailRef = useRef(null)
  const active = projects[activeIdx]

  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0
  }, [activeIdx])

  if (boring) {
    return (
      <div className="boring-page">
        <h1>Projects</h1>
        <div className="boring-projects">
          {projects.map((p, i) => (
            <div key={i} className="boring-project" onClick={() => setModalProject(p)} style={{ cursor: 'pointer' }}>
              <div className="boring-item-header">
                <h3>{p.title}</h3>
                <span>{p.date}</span>
              </div>
              <p>{p.description}</p>
              <p className="boring-tags">{p.tags.join(' · ')}</p>
            </div>
          ))}
        </div>
        <p className="projects-more">…and many more on <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer">GitHub</a></p>
        <ProjectModal project={modalProject} onClose={() => setModalProject(null)} />
      </div>
    )
  }

  return (
    <div className="projects-page">
      <h1 className="page-title">Projects</h1>
      <div className="projects-explorer">
        {/* Sidebar */}
        <div className="projects-sidebar">
          <div className="projects-sidebar-list">
            {projects.map((p, i) => (
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

        {/* Full detail panel */}
        <div className="projects-detail" ref={detailRef} key={activeIdx}>
          <div className="projects-detail-header">
            <div>
              <h2>{active.title}</h2>
              <span className="projects-detail-date">{active.date}</span>
            </div>
            {(active.link || active.social || active.github || active.paper) && (
              <div className="projects-detail-links">
                {active.link && active.link !== '#' && (
                  <a href={active.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Live Site</a>
                )}
                {active.social && (
                  <a href={active.social} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">𝕏</a>
                )}
                {active.github && (
                  <a href={active.github} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">GitHub</a>
                )}
                {active.paper && (
                  <a href={active.paper} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Paper</a>
                )}
              </div>
            )}
          </div>

          <div className="project-tags">
            {active.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>

          <p className="projects-detail-desc">{active.description}</p>

          {/* Demo media */}
          {(active.videoUrl || active.images) && (
            <div className="projects-detail-media">
              {active.videoUrl && (
                <video src={active.videoUrl} controls playsInline className="projects-detail-video" />
              )}
              {active.images && active.images.map((img, i) => (
                <figure key={i} className="projects-detail-figure">
                  <img src={img.src} alt={img.caption || ''} />
                  {img.caption && <figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}

          {/* Arbitrage explainer for CrossOdds */}
          {active.arbitrageExplainer && <ArbitrageExplainer />}

          {/* All sections */}
          {active.sections && active.sections.map((section, i) => (
            <div key={i} className="projects-detail-section">
              <h3>{section.heading}</h3>
              {section.content.map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="projects-more">…and many more on <a href="https://github.com/aniket-mittal" target="_blank" rel="noopener noreferrer">GitHub</a></p>
    </div>
  )
}
