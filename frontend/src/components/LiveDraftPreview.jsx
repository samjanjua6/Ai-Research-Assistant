import { useEffect, useRef, useState, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * LiveDraftPreview — displays real-time token streaming as the LLM synthesizes findings.
 * Includes live markdown rendering, blinking typewriter cursor, smart auto-scrolling,
 * and live word counter.
 */
export default function LiveDraftPreview({ text, node, loop = 0 }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)

  // Calculate live word count
  const wordCount = useMemo(() => {
    if (!text) return 0
    return text.trim().split(/\s+/).filter(Boolean).length
  }, [text])

  // Smart auto-scroll: follow the stream unless the user scrolled up to read earlier text
  useEffect(() => {
    if (!isUserScrolledUp && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [text, isUserScrolledUp])

  // Detect user scroll position
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setIsUserScrolledUp(distanceFromBottom > 150)
  }

  const handleScrollToBottom = () => {
    setIsUserScrolledUp(false)
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const isRefinement = loop > 0

  return (
    <div className="card live-draft-card animate-in" ref={containerRef} onScroll={handleScroll}>
      <div className="live-draft-header">
        <div className="live-draft-title-group">
          <span className="live-pulse-dot" />
          <span className="live-draft-title">
            {isRefinement
              ? `Refining Draft (Revision ${loop + 1})`
              : 'Synthesizing Live Research Draft'}
          </span>
        </div>

        <div className="live-draft-stats">
          <span className="live-word-count-chip">
            ⚡ {wordCount} words
          </span>
        </div>
      </div>

      <div className="live-draft-body">
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        <span className="streaming-cursor" aria-hidden="true">
          ▌
        </span>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Floating scroll to bottom indicator if user scrolled up */}
      {isUserScrolledUp && (
        <button
          type="button"
          className="live-scroll-bottom-btn"
          onClick={handleScrollToBottom}
        >
          ⬇ Follow live stream
        </button>
      )}
    </div>
  )
}
