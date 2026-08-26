import { useState, useRef, useCallback } from 'react'
import { Copy, Check, Link2 } from 'lucide-react'
import { toast } from '../context/ToastContext'

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
 * Normalizes and fixes markdown tables in text:
 * 1. Strips dangling solitary pipe lines (e.g. `\n|\n` or `\n|`)
 * 2. Un-glues single-line double-pipe table rows
 * 3. Ensures tables have a blank line before them so markdown parsers don't merge them with preceding paragraphs
 */
export function normalizeMarkdownTables(text) {
  if (!text) return ''
  let cleaned = text

  // 1. Remove dangling solitary pipe lines
  cleaned = cleaned.replace(/\n\|[ \t]*(?=\n|$)/g, '')

  // 2. Un-glue single-line double-pipe rows
  cleaned = cleaned.replace(/\|[ \t]*\|(?=[:\-])/g, '|\n|')
  cleaned = cleaned.replace(/\|[ \t]*\|(?=[^\n|:\-])/g, '|\n|')

  // 3. Ensure table start has a blank line before it if preceded by non-table text
  cleaned = cleaned.replace(/([^\n|])\n(\|[^\n]+\|\r?\n\|[-: |]+\|)/g, '$1\n\n$2')

  return cleaned
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
  if (!fullMarkdown || !headingText) return normalizeMarkdownTables(fullMarkdown || '')

  const normalized = normalizeMarkdownTables(fullMarkdown)
  const cleanHeading = headingText.replace(/[#*`_]/g, '').trim()
  const lines = normalized.split('\n')

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
    return normalized
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

  return normalizeMarkdownTables(lines.slice(startIndex, endIndex).join('\n').trim())
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
        const preview = textContent.length > 28 ? `${textContent.slice(0, 28)}…` : textContent
        toast.success(`Copied section "${preview}"`, { title: '📋 Section Copied' })
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
        toast.success(`Direct section link copied: #${slug}`, { title: '🔗 Link Copied' })
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
          {copiedSection ? (
            <>
              <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Copied section
            </>
          ) : (
            <>
              <Copy size={11} strokeWidth={1.75} /> Copy section
            </>
          )}
        </button>

        <button
          type="button"
          className="section-action-btn"
          onClick={handleCopyLink}
          title="Copy direct section link"
          aria-label="Copy direct section link"
        >
          {copiedLink ? (
            <>
              <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Link copied
            </>
          ) : (
            <>
              <Link2 size={11} strokeWidth={1.75} /> Link
            </>
          )}
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
      toast.success('Code block copied to clipboard', { title: '📋 Code Copied' })
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
        {copied ? (
          <>
            <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Copied
          </>
        ) : (
          <>
            <Copy size={11} strokeWidth={1.75} /> Copy code
          </>
        )}
      </button>
      <pre ref={codeRef} {...props}>
        {children}
      </pre>
    </div>
  )
}

/**
 * Extracts and sanitizes clean text from a table cell (strips tooltip markup, converts badges to [N], escapes pipes).
 */
function extractCleanCellText(cellElement) {
  if (!cellElement) return ''
  const clone = cellElement.cloneNode(true)

  // Remove tooltip popovers or hidden auxiliary elements
  clone.querySelectorAll('.citation-tooltip, .tooltip, [role="tooltip"]').forEach((el) => el.remove())

  // Format citation badges cleanly as [N]
  clone.querySelectorAll('.citation-badge').forEach((badge) => {
    const num = badge.querySelector('.citation-num')?.innerText || badge.innerText || ''
    const textNode = document.createTextNode(num.trim().startsWith('[') ? num.trim() : `[${num.trim()}]`)
    badge.replaceWith(textNode)
  })

  // Get raw text content and collapse any inner newlines and redundant spaces into a single space
  let text = clone.innerText || clone.textContent || ''
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

  // Escape markdown pipes
  return text.replace(/\|/g, '\\|')
}

/**
 * Converts HTML <table> DOM into a valid, beautifully formatted Markdown table with headers and separators.
 */
export function convertTableElementToMarkdown(tableEl) {
  if (!tableEl) return ''

  const rows = Array.from(tableEl.querySelectorAll('tr'))
  if (!rows.length) return ''

  const markdownRows = []

  rows.forEach((row, rowIdx) => {
    const cells = Array.from(row.querySelectorAll('th, td'))
    if (!cells.length) return

    const cellTexts = cells.map(extractCleanCellText)
    const rowLine = `| ${cellTexts.join(' | ')} |`

    if (rowIdx === 0) {
      markdownRows.push(rowLine)
      const separatorLine = `| ${cellTexts.map(() => '---').join(' | ')} |`
      markdownRows.push(separatorLine)
    } else {
      markdownRows.push(rowLine)
    }
  })

  return markdownRows.join('\n')
}

/**
 * TableBlock component with copy button.
 */
export function TableBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false)
  const tableRef = useRef(null)

  const handleCopyTable = () => {
    if (!tableRef.current) return
    const tableEl = tableRef.current.querySelector('table') || tableRef.current
    const tableText = convertTableElementToMarkdown(tableEl)

    navigator.clipboard.writeText(tableText).then(() => {
      setCopied(true)
      toast.success('Table copied as clean Markdown', { title: '📋 Table Copied' })
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
          title="Copy table as valid Markdown"
        >
          {copied ? (
            <>
              <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Copied table
            </>
          ) : (
            <>
              <Copy size={11} strokeWidth={1.75} /> Copy table
            </>
          )}
        </button>
      </div>
      <div className="table-scroll-wrapper" ref={tableRef}>
        <table {...props}>{children}</table>
      </div>
    </div>
  )
}
