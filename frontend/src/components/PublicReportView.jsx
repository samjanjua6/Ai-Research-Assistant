import { useState, useEffect, useCallback, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThemeToggle } from './ThemeToggle'
import { fetchPublicReport } from '../api/client'
import { toast } from '../context/ToastContext'
import {
  linkifyCitations,
  countCitationFrequencies,
  extractDomain,
  getFaviconUrl,
  CitationBadge,
} from '../utils/citations'
import {
  CheckCircle2,
  Calendar,
  Link2,
  Eye,
  FileDown,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ArrowUp,
  ShieldCheck,
} from 'lucide-react'
import {
  SectionHeading,
  CodeBlock,
  TableBlock,
  normalizeMarkdownTables,
} from '../utils/sectionUtils'
import {
  ReportNotFoundIllustration,
  EmptyState,
} from './illustrations/EmptyStateIllustrations'

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
                `<li id="public-source-${i + 1}"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
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

export function PublicReportView({ shareToken, onForkQuestion, onGoHome }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedUrlIdx, setCopiedUrlIdx] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Fetch report by share token
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPublicReport(shareToken)
      .then((data) => {
        if (!mounted) return
        setReport(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Report not found or has been revoked.')
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [shareToken])

  const normalizedReport = useMemo(() => {
    return normalizeMarkdown(report?.final_report || '')
  }, [report?.final_report])

  // Preprocess markdown text to convert [1], [2] into rich citation badges
  const linkedReport = useMemo(() => {
    return linkifyCitations(normalizedReport, report?.sources || [])
  }, [normalizedReport, report?.sources])

  // Count citation occurrences
  const citationCounts = useMemo(() => {
    return countCitationFrequencies(report?.final_report || '')
  }, [report?.final_report])

  // Markdown custom components mapping for citations, headings, code, and tables
  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }) => {
        if (typeof children === 'string' && children.startsWith('cite:')) {
          const parts = children.split(':')
          const num = parseInt(parts[1], 10)
          const url = decodeURIComponent(parts.slice(2).join(':') || '')
          return <CitationBadge num={num} url={url} sourcePrefix="public-source" />
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

  // ── Copy Markdown Handler ──────────────────────────────────────
  const handleCopyMarkdown = useCallback(() => {
    if (!report?.final_report) return
    navigator.clipboard.writeText(report.final_report).then(() => {
      setCopied(true)
      toast.success('Full report markdown copied!', { title: '📋 Copied Report' })
      setTimeout(() => setCopied(false), 2000)
    })
  }, [report?.final_report])

  // ── Copy Executive Summary ────────────────────────────────────
  const handleCopySummary = useCallback(() => {
    if (!report?.summary) return
    navigator.clipboard.writeText(report.summary).then(() => {
      setCopiedSummary(true)
      toast.success('Executive summary copied!', { title: '📋 Copied Summary' })
      setTimeout(() => setCopiedSummary(false), 1500)
    })
  }, [report?.summary])

  // ── Copy Link Handler ──────────────────────────────────────────
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true)
      toast.success('Public report link copied to clipboard!', { title: '🔗 Link Copied' })
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }, [])

  const handleCopySourceUrl = useCallback((url, index) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrlIdx(index)
      toast.success(`Source link copied: ${extractDomain(url)}`, { title: '🔗 Copied URL' })
      setTimeout(() => setCopiedUrlIdx(null), 1500)
    })
  }, [])

  // ── PDF Export Handler ─────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (!report) return
    setExporting(true)
    let iframe = null
    let blobUrl = null

    try {
      const { marked } = await import('marked')
      const html = buildPDFDocument({
        question: report.question || '',
        summary: report.summary,
        finalReport: normalizedReport,
        sources: report.sources || [],
        markedFn: marked,
      })

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)

      iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;top:-1px;left:-1px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;'
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
      alert('PDF export failed.')
    } finally {
      setExporting(false)
    }
  }, [report, normalizedReport])

  const formattedDate = report?.created_at
    ? new Date(report.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <>
      {/* ── Public Topbar ── */}
      <div className="topbar">
        <div className="topbar-brand" onClick={onGoHome} style={{ cursor: 'pointer' }}>
          <span className="topbar-mark">
            <Sparkles size={15} strokeWidth={2.2} />
          </span>
          Research Assistant
        </div>

        <div className="topbar-right">
          <span className="topbar-badge">Public Report</span>
          <ThemeToggle />
          <button className="btn btn-primary btn-sm" onClick={onGoHome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} strokeWidth={2} /> Open Assistant
          </button>
        </div>
      </div>

      {/* ── Public Report Body ── */}
      <div className="public-report-container animate-in">
        {loading && (
          <div className="auth-splash" style={{ minHeight: '60vh' }}>
            <div className="auth-splash-inner">
              <span className="topbar-mark">🔬</span>
              <p>Loading research report…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card public-error-card">
            <EmptyState
              illustration={<ReportNotFoundIllustration size={110} />}
              title="Report Unavailable or Private"
              description="This research report either does not exist or has been made private by its author."
              action={
                <button className="btn btn-primary" onClick={onGoHome}>
                  ← Go to Research Assistant
                </button>
              }
            />
          </div>
        )}

        {report && (
          <div className="public-report-content">
            {/* Header / Hero */}
            <div className="public-report-hero card">
              <div className="eyebrow" style={{ color: 'var(--violet)' }}>
                Research Question
              </div>
              <h1 className="public-report-title">{report.question}</h1>

              <div className="meta-row" style={{ marginTop: '12px' }}>
                <span className="status-pill status-pill-done">
                  <CheckCircle2 size={12} strokeWidth={2.2} /> Completed
                </span>
                {report.author_name && (
                  <span className="stat">
                    Researched by <b>{report.author_name}</b>
                  </span>
                )}
                {formattedDate && (
                  <span className="stat">
                    <Calendar size={12} strokeWidth={2} /> <b>{formattedDate}</b>
                  </span>
                )}
                {report.sources?.length > 0 && (
                  <span className="stat">
                    <Link2 size={12} strokeWidth={2} /> <b>{report.sources.length} sources</b>
                  </span>
                )}
                {report.views_count > 0 && (
                  <span className="stat">
                    <Eye size={12} strokeWidth={2} /> <b>{report.views_count} views</b>
                  </span>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="public-action-bar">
                <button
                  className={`copy-btn pdf-btn ${exporting ? 'pdf-btn-loading' : ''}`}
                  onClick={handleExportPDF}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <span className="pdf-spinner" /> Generating…
                    </>
                  ) : (
                    <>
                      <FileDown size={13} strokeWidth={1.75} /> Export PDF
                    </>
                  )}
                </button>
                <button className="copy-btn" onClick={handleCopyMarkdown} title="Copy entire report markdown">
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={2.2} className="icon-success-pop" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} strokeWidth={1.75} /> Copy Report
                    </>
                  )}
                </button>
                <button className="copy-btn" onClick={handleCopyLink} title="Copy shareable link">
                  {copiedLink ? (
                    <>
                      <Check size={13} strokeWidth={2.2} className="icon-success-pop" /> Link Copied!
                    </>
                  ) : (
                    <>
                      <Link2 size={13} strokeWidth={1.75} /> Copy Link
                    </>
                  )}
                </button>
                {onForkQuestion && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onForkQuestion(report.question)}
                    style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Sparkles size={13} strokeWidth={2} /> Research This Topic →
                  </button>
                )}
              </div>
            </div>

            {/* TL;DR Executive Summary */}
            {report.summary && (
              <div className="card tldr" style={{ marginTop: '20px' }}>
                <div className="tldr-header-row">
                  <div className="eyebrow">TL;DR Executive Summary</div>
                  <button
                    type="button"
                    className="tldr-copy-btn"
                    onClick={handleCopySummary}
                    title="Copy executive summary"
                  >
                    {copiedSummary ? (
                      <>
                        <Check size={12} strokeWidth={2.2} className="icon-success-pop" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} strokeWidth={1.75} /> Copy summary
                      </>
                    )}
                  </button>
                </div>
                <p>{report.summary}</p>
              </div>
            )}

            {/* Main Report Body */}
            <div className="card report-panel-card" style={{ marginTop: '20px' }} id="publicReportCard">
              <div className="report-body" id="publicReportContent">
                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {linkedReport}
                </Markdown>
              </div>

              {/* Sources */}
              {report.sources?.length > 0 && (
                <div className="sources-section" id="publicSourcesSection">
                  <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} strokeWidth={2} /> Verified Web Sources ({report.sources.length})
                  </span>
                  <ul className="sources-list-enhanced">
                    {report.sources.map((url, i) => {
                      const num = i + 1
                      const domain = extractDomain(url)
                      const favicon = getFaviconUrl(url)
                      const citeCount = citationCounts[num] || 0

                      return (
                        <li key={i} id={`public-source-${num}`} className="source-card-item">
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
                                {copiedUrlIdx === i ? (
                                  <>
                                    <Check size={11} strokeWidth={2.2} className="icon-success-pop" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} strokeWidth={1.75} /> Copy
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="source-action-icon-btn"
                                onClick={() => {
                                  const content = document.getElementById('publicReportContent')
                                  if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                title="Jump back to report text"
                              >
                                <ArrowUp size={11} strokeWidth={2} /> Top
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
                            <ExternalLink size={11} strokeWidth={2} className="source-external-icon" />
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Callout Banner */}
            <div className="public-cta-banner card" style={{ marginTop: '24px' }}>
              <div className="public-cta-content">
                <span className="topbar-mark" style={{ width: '36px', height: '36px' }}>
                  <Sparkles size={18} strokeWidth={2} />
                </span>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Explore any topic with AI Research Assistant</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Multi-step autonomous agent that plans, searches, self-reviews, and synthesizes reports in real time.
                  </p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={onGoHome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Try Free Assistant</span>
                <Sparkles size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default PublicReportView
