import { useEffect, useCallback } from 'react'
import ArbitrageExplainer from './ArbitrageExplainer'

export default function ProjectModal({ project, onClose }) {
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!project) return

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [project, handleKey])

  if (!project) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="modal-header">
          <h2>{project.title}</h2>
          {project.date && <span className="modal-date">{project.date}</span>}
        </div>

        <div className="modal-tags">
          {project.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>

        <div className="modal-body">
          <p className="modal-description">{project.description}</p>

          {(project.videoUrl || project.youtubeUrl || project.images) && (
            <div className="modal-section">
              <h3 className="modal-section-heading">Demo</h3>
              {project.youtubeUrl && (
                <div className="modal-video">
                  <iframe
                    src={project.youtubeUrl.replace('youtu.be/', 'www.youtube.com/embed/').replace('watch?v=', 'embed/')}
                    title="Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {project.videoUrl && (
                <div className="modal-video">
                  <video src={project.videoUrl} controls playsInline />
                </div>
              )}
              {project.images && (
                <div className="modal-images">
                  {project.images.map((img, i) => (
                    <figure key={i} className="modal-figure">
                      <img src={img.src} alt={img.caption || `${project.title} visualization ${i + 1}`} className="modal-image" />
                      {img.caption && <figcaption className="modal-caption">{img.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}

          {(project.link || project.social || project.github || project.paper) && (
            <div className="modal-links">
              {project.link && project.link !== '#' && (
                <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  Live Site
                </a>
              )}
              {project.social && (
                <a href={project.social} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  𝕏
                </a>
              )}
              {project.github && (
                <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  GitHub
                </a>
              )}
              {project.paper && (
                <a href={project.paper} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Paper
                </a>
              )}
            </div>
          )}

          {project.arbitrageExplainer && <ArbitrageExplainer />}

          {project.sections && project.sections.map((section, i) => (
            <div key={i} className="modal-section">
              <h3 className="modal-section-heading">{section.heading}</h3>
              {section.content.map((paragraph, j) => (
                <p key={j} className="modal-section-text">{paragraph}</p>
              ))}
            </div>
          ))}

        </div>

      </div>
    </div>
  )
}
