import { useState, useRef, useEffect } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from '../context/ToastContext'

/**
 * Extract clean domain name from URL (e.g. 'nature.com').
 */
export function extractDomain(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Return Google S2 high-res favicon URL for a domain.
 */
export function getFaviconUrl(url) {
  const domain = extractDomain(url)
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32` : null
}

/**
 * Count the frequency of each citation index [1], [2] in markdown text.
 * Returns an object mapping { 1: 3, 2: 1, ... }
 */
export function countCitationFrequencies(text) {
  if (!text) return {}
  const counts = {}
  const regex = /\[(\d+(?:\s*,\s*\d+)*)\]/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const nums = match[1].split(/\s*,\s*/).map((n) => parseInt(n.trim(), 10)).filter(Boolean)
    for (const num of nums) {
      counts[num] = (counts[num] || 0) + 1
    }
  }
  return counts
}

/**
 * Preprocess markdown text to convert citation brackets [1], [2], [1, 2]
 * into custom markdown links that react-markdown can intercept.
 */
export function linkifyCitations(text, sources = []) {
  if (!text) return ''

  return text.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, numString) => {
    const numbers = numString
      .split(/\s*,\s*/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)

    if (numbers.length === 0) return match

    return numbers
      .map((num) => {
        const item = sources[num - 1] || ''
        const url = typeof item === 'string' ? item : (item?.url || '')
        const encodedUrl = encodeURIComponent(url)
        return `[cite:${num}:${encodedUrl}](#source-${num})`
      })
      .join(' ')
  })
}

/**
 * CitationBadge component — rendered for every [cite:N:url] link.
 * Uses inline anchor tag for clean clipboard text selection without newline breaking.
 */
export function CitationBadge({ num, url, sourcePrefix = 'source' }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)
  const domain = extractDomain(url)
  const favicon = getFaviconUrl(url)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 220)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleClick = (e) => {
    e.preventDefault()
    const targetId = `${sourcePrefix}-${num}`
    const targetEl = document.getElementById(targetId)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      targetEl.classList.remove('source-highlight-pulse')
      void targetEl.offsetWidth
      targetEl.classList.add('source-highlight-pulse')
      setTimeout(() => targetEl.classList.remove('source-highlight-pulse'), 2500)
    } else if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e)
    }
  }

  const handleCopyUrl = (e) => {
    e.stopPropagation()
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success(`Source link copied: ${domain || url}`, { title: 'Link Copied' })
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span
      className="citation-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={`#${sourcePrefix}-${num}`}
        className="citation-badge"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Jump to citation ${num}: ${domain || url || 'Source'}`}
      >
        <span className="citation-num">[{num}]</span>
      </a>

      {showTooltip && (
        <div className="citation-tooltip animate-in" role="tooltip">
          <div className="citation-tooltip-header">
            {favicon && (
              <img
                src={favicon}
                alt=""
                className="citation-favicon"
                width={16}
                height={16}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <span className="citation-domain">{domain || `Source [${num}]`}</span>
            <span className="citation-tag">Source {num}</span>
          </div>

          {url ? (
            <div className="citation-url" title={url}>
              {url}
            </div>
          ) : (
            <div className="citation-url citation-url-empty">
              Footnote reference [{num}]
            </div>
          )}

          {url && (
            <div className="citation-tooltip-actions">
              <button
                type="button"
                className="citation-action-btn"
                onClick={handleCopyUrl}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {copied ? (
                  <>
                    <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={11} strokeWidth={1.75} /> Copy URL
                  </>
                )}
              </button>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="citation-action-btn citation-open-btn"
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span>Open link</span>
                <ExternalLink size={11} strokeWidth={2} />
              </a>
            </div>
          )}
        </div>
      )}
    </span>
  )
}
