import { useState, useRef, useCallback } from 'react'

/**
 * Converts heading text to a clean URL-friendly slug.
 */
export function slugifyHeading(text) {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Extracts raw text from React node children.
 */
export function getNodeText(node) {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')
  if (typeof node === 'object' && node.props && node.props.children) {
    return getNodeText(node.props.children)
  }
  return ''
}

/**
 * Slices section markdown from a heading until the next heading of equal or higher depth.
 */
export function extractSectionMarkdown(headingText, fullMarkdown, level = 2) {
  if (!fullMarkdown || !headingText) return fullMarkdown || ''

  const cleanHeading = headingText.replace(/[#*`_]/g, '').trim()
  const lines = fullMarkdown.split('\n')

  let startIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineClean = line.replace(/^[#\s\d.-]+/, '').trim().toLowerCase()
    const targetClean = cleanHeading.replace(/^[\d.-]+/, '').trim().toLowerCase()

    if (
      (line.startsWith('#') && line.toLowerCase().includes(targetClean)) ||
      (lineClean.length > 2 && targetClean.length > 2 && lineClean.includes(targetClean))
    ) {
      startIndex = i
      break
    }
  }

  if (startIndex === -1) {
    return fullMarkdown
  }

  let endIndex = lines.length
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (level === 2 && /^#{1,2}\s+/.test(line)) {
      endIndex = i
      break
    } else if (level === 3 && /^#{1,3}\s+/.test(line)) {
      endIndex = i
      break
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trim()
}

/**
 * SectionHeading component for h2 and h3 elements.
 * Provides hover action buttons: Copy Section Markdown & Copy Deep Link.
 */
export function SectionHeading({ level = 2, children, rawMarkdown, ...props }) {
  const [copiedSection, setCopiedSection] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const headingRef = useRef(null)

  const textContent = getNodeText(children)
  const slug = slugifyHeading(textContent)
  const Tag = level === 3 ? 'h3' : 'h2'

  const handleCopySection = useCallback(
    (e) => {
      e.stopPropagation()
      if (!rawMarkdown) return
      const sectionText = extractSectionMarkdown(textContent, rawMarkdown, level)
      navigator.clipboard.writeText(sectionText).then(() => {
        setCopiedSection(true)
        setTimeout(() => setCopiedSection(false), 1800)
      })
    },
    [textContent, rawMarkdown, level]
  )

  const handleCopyLink = useCallback(
    (e) => {
      e.stopPropagation()
      const url = new URL(window.location.href)
      url.hash = slug
      window.history.pushState({}, '', url.toString())
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 1800)
      })
    },
    [slug]
  )

  return (
    <div className="section-heading-container" id={slug} ref={headingRef}>
      <Tag className="section-heading-text" {...props}>
        {children}
      </Tag>

      <div className="section-heading-actions">
        <button
          type="button"
          className="section-action-btn"
          onClick={handleCopySection}
          title="Copy this section's markdown"
          aria-label="Copy section markdown"
        >
          {copiedSection ? '✓ Copied section' : '📋 Copy section'}
        </button>

        <button
          type="button"
          className="section-action-btn"
          onClick={handleCopyLink}
          title="Copy direct section link"
          aria-label="Copy direct section link"
        >
          {copiedLink ? '✓ Link copied' : '🔗 Link'}
        </button>
      </div>
    </div>
  )
}

/**
 * CodeBlock component with copy button.
 */
export function CodeBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef(null)

  const handleCopyCode = () => {
    if (!codeRef.current) return
    const text = codeRef.current.innerText || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="code-block-container">
      <button
        type="button"
        className="code-copy-btn"
        onClick={handleCopyCode}
        title="Copy code snippet"
      >
        {copied ? '✓ Copied' : '📋 Copy code'}
      </button>
      <pre ref={codeRef} {...props}>
        {children}
      </pre>
    </div>
  )
}

/**
 * TableBlock component with copy button.
 */
export function TableBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false)
  const tableRef = useRef(null)

  const handleCopyTable = () => {
    if (!tableRef.current) return
    const rows = Array.from(tableRef.current.querySelectorAll('tr'))
    const tableText = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td')).map((c) =>
          c.innerText.trim().replace(/\|/g, '\\|')
        )
        return `| ${cells.join(' | ')} |`
      })
      .join('\n')

    navigator.clipboard.writeText(tableText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="table-block-container">
      <div className="table-top-bar">
        <span className="table-label">Data Table</span>
        <button
          type="button"
          className="table-copy-btn"
          onClick={handleCopyTable}
          title="Copy table as Markdown"
        >
          {copied ? '✓ Copied table' : '📋 Copy table'}
        </button>
      </div>
      <div className="table-scroll-wrapper" ref={tableRef}>
        <table {...props}>{children}</table>
      </div>
    </div>
  )
}
