import { useState, useCallback, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ShareModal } from './ShareModal'
import {
  linkifyCitations,
  countCitationFrequencies,
  extractDomain,
  getFaviconUrl,
  CitationBadge,
} from '../utils/citations'
import {
  SectionHeading,
  CodeBlock,
  TableBlock,
  normalizeMarkdownTables,
} from '../utils/sectionUtils'

function normalizeMarkdown(text) {
  return normalizeMarkdownTables(text || '')
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Full styled PDF HTML document ────────────────────────────────────────────
function buildPDFDocument({ question, summary, finalReport, sources, markedFn }) {
  let linkedReport = finalReport || ''
  if (sources?.length) {
    linkedReport = linkedReport.replace(/\[(\d+)\]/g, (m, num) => {
      const idx = parseInt(num, 10) - 1
      const url = sources[idx]
      if (url) {
        return `[<sup>[${num}]</sup>](${url})`
      }
      return `<sup>[${num}]</sup>`
    })
  }

  const reportHtml = markedFn(linkedReport)
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const summaryHtml = summary
    ? `<div class="tldr-box">
        <div class="tldr-label">TL;DR</div>
        <p class="tldr-text">${escapeHtml(summary)}</p>
       </div>`
    : ''

  const sourcesHtml = sources?.length
    ? `<div class="sources-section" id="sources">
        <div class="section-label">Sources</div>
        <ol class="sources-list">
          ${sources
            .map(
              (url, i) =>
                `<li id="source-${i + 1}"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
            )
            .join('')}
        </ol>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(question || 'Research Report')}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.75;
  color: #1a1a2e;
  background: #fff;
}
@page { size: A4; margin: 0; }
@media print {
  html, body { width: 210mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  .pdf-cover { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .tldr-box, .sources-section, table, pre, blockquote { page-break-inside: avoid; break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
}
.pdf-cover {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%);
  color: #fff;
  padding: 52px 48px 44px;
}
.cover-app {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 9.5pt;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,.55);
  margin-bottom: 16px;
}
.cover-question {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 20pt;
  font-weight: 700;
  line-height: 1.3;
  color: #ffffff;
  margin-bottom: 24px;
}
.cover-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.chip {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 8pt;
  font-weight: 500;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.2);
  color: rgba(255,255,255,.85);
  padding: 4px 12px;
  border-radius: 999px;
}
.pdf-body { padding: 40px 48px 56px; }
.tldr-box {
  background: #f4f1fd;
  border: 1px solid #d9d2f8;
  border-left: 4px solid #7c6af0;
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 32px;
}
.tldr-label {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 7.5pt;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #7c6af0;
  margin-bottom: 6px;
}
.tldr-text { font-size: 10.5pt; line-height: 1.65; color: #2d2b4e; }
h1, h2, h3, h4 { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f0c29; margin-top: 28px; margin-bottom: 12px; line-height: 1.35; }
h1 { font-size: 16pt; border-bottom: 2px solid #7c6af0; padding-bottom: 6px; }
h2 { font-size: 13.5pt; color: #302b63; border-bottom: 1px solid #e8e4f8; padding-bottom: 4px; }
p { margin-bottom: 14px; text-align: justify; }
ul, ol { margin: 0 0 16px 24px; }
li { margin-bottom: 6px; }
blockquote { border-left: 3px solid #7c6af0; margin: 18px 0; padding: 8px 18px; color: #4a4870; background: #faf9ff; font-style: italic; }
table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 9.5pt; }
th { background: #302b63; color: #fff; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600; text-align: left; padding: 9px 12px; }
td { padding: 8px 12px; border-bottom: 1px solid #e6e3f4; color: #24243e; }
tr:nth-child(even) td { background: #f9f8fe; }
.section-label { display: block; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 8pt; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #7c6af0; margin-bottom: 12px; }
.sources-section { margin-top: 36px; padding-top: 22px; border-top: 2px solid #e6e0ff; }
.sources-list { margin: 0 0 0 18px; }
.sources-list li { margin-bottom: 5px; font-family: 'Courier New', monospace; font-size: 8pt; color: #5a4fd0; word-break: break-all; }
.pdf-footer { margin-top: 44px; padding-top: 14px; border-top: 1px solid #eeeaff; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 7.5pt; color: #b0aed0; }
</style>
</head>
<body>
<div class="pdf-cover">
  <div class="cover-app">🔬 &nbsp; Research Assistant &nbsp;·&nbsp; AI-Generated Report</div>
  <div class="cover-question">${escapeHtml(question || 'Research Report')}</div>
  <div class="cover-chips">
    <span class="chip">📅 ${date}</span>
    ${sources?.length ? `<span class="chip">🔗 ${sources.length} sources</span>` : ''}
    <span class="chip">⚡ Powered by LangGraph</span>
  </div>
</div>
<div class="pdf-body">
  ${summaryHtml}
  <div class="report-content">${reportHtml}</div>
  ${sourcesHtml}
  <div class="pdf-footer">Generated by Research Assistant &nbsp;·&nbsp; research.mychatbot.codes &nbsp;·&nbsp; ${date}</div>
</div>
</body>
</html>`
}

export default function ReportPanel({ report, question, runId }) {
  const [copied, setCopied] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [copiedUrlIdx, setCopiedUrlIdx] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const normalizedReport = useMemo(() => {
    return normalizeMarkdown(report?.final_report || '')
  }, [report?.final_report])

  // Preprocess markdown text to convert [1], [2] into rich citation badges
  const linkedReport = useMemo(() => {
    return linkifyCitations(normalizedReport, report?.sources || [])
  }, [normalizedReport, report?.sources])

  // Count how many times each source is cited
  const citationCounts = useMemo(() => {
    return countCitationFrequencies(report?.final_report || '')
  }, [report?.final_report])

  // Markdown custom component mapping for citations, headings, code, and tables
  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }) => {
        if (typeof children === 'string' && children.startsWith('cite:')) {
          const parts = children.split(':')
          const num = parseInt(parts[1], 10)
          const url = decodeURIComponent(parts.slice(2).join(':') || '')
          return <CitationBadge num={num} url={url} sourcePrefix="source" />
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        )
      },
      h2: ({ children, ...props }) => (
        <SectionHeading level={2} rawMarkdown={normalizedReport} {...props}>
          {children}
        </SectionHeading>
      ),
      h3: ({ children, ...props }) => (
        <SectionHeading level={3} rawMarkdown={normalizedReport} {...props}>
          {children}
        </SectionHeading>
      ),
      pre: ({ children, ...props }) => (
        <CodeBlock {...props}>{children}</CodeBlock>
      ),
      table: ({ children, ...props }) => (
        <TableBlock {...props}>{children}</TableBlock>
      ),
    }),
    [normalizedReport]
  )

  // ── Copy Full Report ──────────────────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report.final_report || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [report.final_report])

  // ── Copy Executive Summary ────────────────────────────────────
  const handleCopySummary = useCallback(() => {
    if (!report.summary) return
    navigator.clipboard.writeText(report.summary).then(() => {
      setCopiedSummary(true)
      setTimeout(() => setCopiedSummary(false), 1500)
    })
  }, [report.summary])

  const handleCopySourceUrl = useCallback((url, index) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrlIdx(index)
      setTimeout(() => setCopiedUrlIdx(null), 1500)
    })
  }, [])

  // ── Download .md ──────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const content = [
      '# Research Report\n',
      report.summary ? `## Executive Summary\n${report.summary}\n` : '',
      report.final_report || '',
      report.sources?.length
        ? `\n## Sources\n${report.sources.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`
        : '',
    ].join('\n')
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-report-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  // ── Export PDF ─────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setExporting(true)
    let iframe = null
    let blobUrl = null

    try {
      const { marked } = await import('marked')

      const html = buildPDFDocument({
        question: question || '',
        summary: report.summary,
        finalReport: normalizedReport,
        sources: report.sources || [],
        markedFn: marked,
      })

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)

      iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;top:-1px;left:-1px;width:1px;height:1px;' +
        'border:none;opacity:0;pointer-events:none;'
      document.body.appendChild(iframe)

      await new Promise((resolve, reject) => {
        iframe.onload = () => setTimeout(resolve, 700)
        iframe.onerror = reject
        iframe.src = blobUrl
      })

      iframe.contentWindow.focus()
      iframe.contentWindow.print()

      const cleanup = () => {
        try { if (iframe) document.body.removeChild(iframe) } catch (_) {}
        try { if (blobUrl) URL.revokeObjectURL(blobUrl) } catch (_) {}
        iframe = null
        blobUrl = null
      }
      try { iframe.contentWindow.addEventListener('afterprint', cleanup) } catch (_) {}
      setTimeout(cleanup, 60_000)
    } catch (err) {
      console.error('PDF export failed:', err)
      try { if (iframe) document.body.removeChild(iframe) } catch (_) {}
      try { if (blobUrl) URL.revokeObjectURL(blobUrl) } catch (_) {}
      alert('PDF export failed. Please use "Download .md" instead.')
    } finally {
      setExporting(false)
    }
  }, [report, normalizedReport, question])

  const targetRunId = runId || report?.id

  return (
    <div className="card animate-in">
      <div className="report-header-row">
        <div>
          <h3 className="report-title">Final report</h3>
        </div>
        <div className="report-actions">
          {/* Share button */}
          {targetRunId && (
            <button
              className="copy-btn share-btn"
              onClick={() => setShowShare(true)}
              title="Share report with a public link"
            >
              🔗 Share
            </button>
          )}

          <button
            className={`copy-btn pdf-btn${exporting ? ' pdf-btn-loading' : ''}`}
            onClick={handleExportPDF}
            disabled={exporting}
            title="Export as PDF — opens print dialog"
          >
            {exporting ? (
              <>
                <span className="pdf-spinner" />Generating…
              </>
            ) : (
              <>📄 Export PDF</>
            )}
          </button>

          <button className="copy-btn" onClick={handleDownload} title="Download as Markdown">
            📥 Download .md
          </button>

          <button className="copy-btn" onClick={handleCopy} title="Copy entire report to clipboard">
            {copied ? '✓ Copied' : '📋 Copy report'}
          </button>
        </div>
      </div>

      {report.summary && (
        <div className="tldr">
          <div className="tldr-header-row">
            <div className="eyebrow">TL;DR Executive Summary</div>
            <button
              type="button"
              className="tldr-copy-btn"
              onClick={handleCopySummary}
              title="Copy executive summary"
            >
              {copiedSummary ? '✓ Copied' : '📋 Copy summary'}
            </button>
          </div>
          <p>{report.summary}</p>
        </div>
      )}

      <div className="report-body" id="reportBody">
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {linkedReport}
        </Markdown>
      </div>

      {report.sources?.length > 0 && (
        <div className="sources-section" id="sourcesSection">
          <div className="sources-header-row">
            <span className="eyebrow">Verified Sources ({report.sources.length})</span>
          </div>

          <ul className="sources-list-enhanced">
            {report.sources.map((url, i) => {
              const num = i + 1
              const domain = extractDomain(url)
              const favicon = getFaviconUrl(url)
              const citeCount = citationCounts[num] || 0

              return (
                <li key={i} id={`source-${num}`} className="source-card-item">
                  <div className="source-card-header">
                    <span className="source-card-index">[{num}]</span>
                    {favicon && (
                      <img
                        src={favicon}
                        alt=""
                        className="source-card-favicon"
                        width={16}
                        height={16}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <span className="source-card-domain">{domain}</span>

                    {citeCount > 0 && (
                      <span className="source-cite-chip" title={`Cited ${citeCount} times in this report`}>
                        Cited {citeCount}x
                      </span>
                    )}

                    <div className="source-card-actions">
                      <button
                        type="button"
                        className="source-action-icon-btn"
                        onClick={() => handleCopySourceUrl(url, i)}
                        title="Copy source URL"
                      >
                        {copiedUrlIdx === i ? '✓ Copied' : '📋 Copy'}
                      </button>

                      <button
                        type="button"
                        className="source-action-icon-btn"
                        onClick={() => {
                          const body = document.getElementById('reportBody')
                          if (body) body.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        title="Jump back to report text"
                      >
                        ↩ Back
                      </button>
                    </div>
                  </div>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-card-url"
                    title={url}
                  >
                    <span>{url}</span>
                    <span className="source-external-arrow">↗</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {showShare && targetRunId && (
        <ShareModal
          runId={targetRunId}
          question={question}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
