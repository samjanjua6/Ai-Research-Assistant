import { useEffect, useRef, useState, useMemo } from 'react'
import { Zap, ArrowDown } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  linkifyCitations,
  CitationBadge,
  ConfidenceBadge,
  DocCitationBadge,
  UrlCitationBadge,
} from '../utils/citations'

/**
 * LiveDraftPreview — displays real-time token streaming as the LLM synthesizes findings.
 * Includes live markdown rendering, citation badges, blinking typewriter cursor,
 * smart auto-scrolling, and live word counter.
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

  const formattedText = useMemo(() => {
    return linkifyCitations(text || '')
  }, [text])

  // Custom markdown components for citation links
  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }) => {
        const childText = Array.isArray(children)
          ? children.map((c) => (typeof c === 'string' ? c : (c?.props?.children || ''))).join('')
          : (typeof children === 'string' ? children : String(children || ''))

        if (childText.startsWith('cite:')) {
          const parts = childText.split(':')
          const num = parseInt(parts[1], 10)
          const url = decodeURIComponent(parts.slice(2).join(':') || '')
          return <CitationBadge num={num} url={url} sourcePrefix="source" />
        }
        if (childText.startsWith('confidence:')) {
          const parts = childText.split(':')
          const type = parts[1] || 'medium'
          const label = parts[2] ? decodeURIComponent(parts[2]) : null
          return <ConfidenceBadge type={type} label={label} />
        }
        if (childText.startsWith('doc-cite:')) {
          const label = decodeURIComponent(childText.replace('doc-cite:', ''))
          return <DocCitationBadge label={label} />
        }
        if (childText.startsWith('url-cite:')) {
          const label = decodeURIComponent(childText.replace('url-cite:', ''))
          return <UrlCitationBadge label={label} />
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        )
      },
    }),
    []
  )

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
          <span className="live-word-count-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Zap size={11} strokeWidth={2} /> {wordCount} words
          </span>
        </div>
      </div>

      <div className="live-draft-body">
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {formattedText}
        </Markdown>
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <ArrowDown size={12} strokeWidth={2} /> Follow live stream
        </button>
      )}
    </div>
  )
}
