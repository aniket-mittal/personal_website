import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export default function Lightbox({ items, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex)

  const prev = useCallback(() => setIdx(i => (i - 1 + items.length) % items.length), [items.length])
  const next = useCallback(() => setIdx(i => (i + 1) % items.length), [items.length])

  const handleKey = useCallback((e) => {
    e.stopPropagation()
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }, [onClose, prev, next])

  useEffect(() => {
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [handleKey])

  const item = items[idx]
  const isVideo = item.type === 'video'
  const multi = items.length > 1

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        {isVideo ? (
          <video src={item.src} autoPlay loop muted playsInline />
        ) : (
          <img src={item.src} alt={item.alt || ''} />
        )}
        {multi && (
          <>
            <button className="lightbox-arrow lightbox-arrow--prev" onClick={prev}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="lightbox-arrow lightbox-arrow--next" onClick={next}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </button>
            <div className="lightbox-counter">{idx + 1} / {items.length}</div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
