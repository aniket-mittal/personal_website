import { useTheme } from '../context/ThemeContext'

const experience = [
  {
    role: 'ML Engineer Intern',
    subtitle: 'Explainable AI',
    company: 'NASA',
    period: 'Jun 2025 – Aug 2025',
    bullets: [
      'Developed an end-to-end explainable AI framework for exoplanet validation in Tensorflow, validating 300+ new exoplanets & accelerating vetting 100x for 30+ researchers classifying exoplanets from telescope data.',
      'Balanced latency & accuracy by introducing & proving the use of multi-head attention modules for exoplanet models by conducting 15+ experiments evaluating traditional explainable AI approaches (e.g. SHAP, LIME).',
    ],
  },
  {
    role: 'AI Engineer',
    subtitle: 'AI Agents',
    company: 'Power My Analytics',
    period: 'Jan 2025 – May 2025',
    bullets: [
      'Built an AI agent using Claude and TypeScript to automate connector development using test-driven development for its marketing platform, reducing manual engineering work by 500+ labor hours (~3 months).',
      'Presented solution directly to the CEO & Head of AI. Pipeline deployed as part of core development workflow.',
    ],
  },
  {
    role: 'AI/ML Engineer Intern',
    subtitle: 'Computer Vision',
    company: 'NASA',
    period: 'May 2023 – May 2024',
    bullets: [
      'Independently engineered novel ML models (U-Net, CNNs, etc.) in Tensorflow to classify cosmic rays for the James Webb Space Telescope, achieving 70% higher precision/recall. Research awarded the Ames CIF $125k Grant.',
      'Built a full-stack application in Python, Javascript, SQLite & HTML for ML-assisted data labeling (10x faster). Presented to telescope executives, researchers & data sciences group, growing application to 30 users & 50k+ visits.',
    ],
  },
  {
    role: 'Software Engineer',
    subtitle: 'Gradient Descent',
    company: 'San Jose State University CFD Lab',
    period: 'Feb 2023 – Aug 2024',
    bullets: [
      'Identified optimal propulsive gaits for fish-like swimming by integrating the Immersed Boundary Projection Method and Adjoint Method in C++, reducing computation time by 1M× (from months to a single run).',
      'Presented at the 76th American Physical Society DFD Conference. Project granted by US Office of Naval Research.',
    ],
  },
]

const education = {
  school: 'UC Berkeley',
  program: 'Management, Entrepreneurship & Technology Program',
  degrees: 'B.S. Electrical Engineering & Computer Science + Business Administration',
  gpa: '3.9 / 4.0',
  period: '',
  eecsCourses: [
    'Machine Learning', 'Data Structures & Algorithms', 'Computer Architecture',
    'Discrete Math & Probability', 'Probability & Random Processes',
    'Robotics & Control', 'Linear Algebra & Diff Eq', 'Signals & Systems', 'Data Science',
  ],
  businessCourses: [
    'Financial Accounting', 'Business Ethics', 'Managing Tech Innovation', 'Entrepreneurship Immersion',
  ],
}

const skills = {
  'Languages': 'Python, Java, JavaScript, TypeScript, C, C++, Verilog, SQL, Assembly, CAD',
  'Frameworks': 'REST APIs, FastAPI, Flask, Tensorflow, Pytorch, HuggingFace, LangChain, OpenCV, YOLO, SDXL, React, Next.js',
  'Developer Tools': 'Docker, Git, AWS, Firebase, MongoDB, PostgreSQL, Pinecone, Qdrant, Supabase',
}

export default function Resume() {
  const { boring } = useTheme()

  if (boring) {
    return (
      <div className="boring-page">
        <h1>Resume</h1>

        <div className="boring-section">
          <h2>Education</h2>
          <div className="boring-item">
            <div className="boring-item-header">
              <strong>{education.school}, {education.program}</strong>
              <span>{education.period}</span>
            </div>
            <p>{education.degrees} &nbsp;|&nbsp; GPA: {education.gpa}</p>
            <p className="boring-detail">EECS: {education.eecsCourses.join(', ')}</p>
            <p className="boring-detail">Business: {education.businessCourses.join(', ')}</p>
          </div>
        </div>

        <div className="boring-section">
          <h2>Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="boring-item">
              <div className="boring-item-header">
                <strong>{exp.role}, {exp.company}</strong>
                <span>{exp.period}</span>
              </div>
              <ul>
                {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="boring-section">
          <h2>Patents & Inventions</h2>
          <p>Accumulated 10+ provisional patents for inventions spanning AI-powered security camera systems, intelligent AI-based sprinkler controllers, water conservation drones, and other applied AI hardware-software solutions.</p>
        </div>

        <div className="boring-section">
          <h2>Skills</h2>
          {Object.entries(skills).map(([cat, list]) => (
            <p key={cat}><strong>{cat}:</strong> {list}</p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="resume-page">
      <h1 className="page-title">Resume</h1>

      <section className="resume-section">
        <h2>Education</h2>
        <div className="resume-card">
          <div className="resume-card-header">
            <h3>{education.school}</h3>
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
        <h2>Experience</h2>
        {experience.map((exp, i) => (
          <div key={i} className="resume-card">
            <div className="resume-card-header">
              <h3>{exp.role}</h3>
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
        <h2>Patents & Inventions</h2>
        <div className="resume-card">
          <p className="resume-detail">Accumulated 10+ provisional patents for inventions spanning AI-powered security camera systems, intelligent AI-based sprinkler controllers, water conservation drones, and other applied AI hardware-software solutions.</p>
        </div>
      </section>

      <section className="resume-section">
        <h2>Skills</h2>
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
  )
}
