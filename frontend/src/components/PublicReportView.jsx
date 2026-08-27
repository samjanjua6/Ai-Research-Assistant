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
  ConfidenceBadge,
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
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowRight,
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
import { Logo, LogoMark } from './brand/Logo'

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
      const item = sources[idx]
      const url = typeof item === 'string' ? item : item?.url
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
        <div class="section-label">Verified Sources & Evidence Citations (${sources.length})</div>
        <ol class="sources-list">
          ${sources
            .map((item, i) => {
              const url = typeof item === 'string' ? item : item?.url || ''
              const score = typeof item === 'object' && item?.score ? ` [Relevance: ${item.score}%]` : ''
              const auth = typeof item === 'object' && item?.authority_label ? ` • ${item.authority_label}` : ''
              return `<li id="public-source-${i + 1}"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${score}${auth}</li>`
            })
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
  <div class="cover-app">AI Research Assistant &nbsp;·&nbsp; Synthesis Report</div>
  <div class="cover-question">${escapeHtml(question || 'Research Report')}</div>
  <div class="cover-chips">
    <span class="chip">${date}</span>
    ${sources?.length ? `<span class="chip">${sources.length} sources</span>` : ''}
    <span class="chip">Powered by LangGraph</span>
  </div>
</div>
<div class="pdf-body">
  ${summaryHtml}
  <div class="report-content">${reportHtml}</div>
  ${sourcesHtml}
  <div class="pdf-footer">Generated by AI Research Assistant &nbsp;·&nbsp; research.mychatbot.codes &nbsp;·&nbsp; ${date}</div>
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
  const [copiedFollowUpIdx, setCopiedFollowUpIdx] = useState(null)
  const [expandedExcerptIdx, setExpandedExcerptIdx] = useState(null)
  const [exporting, setExporting] = useState(false)

  const handleCopyFollowUp = useCallback((qText, idx) => {
    if (!qText) return
    navigator.clipboard.writeText(qText).then(() => {
      setCopiedFollowUpIdx(idx)
      toast.success('Investigation question copied!')
      setTimeout(() => setCopiedFollowUpIdx(null), 2000)
    })
  }, [])

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
        if (typeof children === 'string' && children.startsWith('confidence:')) {
          const type = children.replace('confidence:', '')
          return <ConfidenceBadge type={type} />
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
      toast.success('Full report markdown copied!', { title: 'Report Copied' })
      setTimeout(() => setCopied(false), 2000)
    })
  }, [report?.final_report])

  // ── Copy Executive Summary ────────────────────────────────────
  const handleCopySummary = useCallback(() => {
    if (!report?.summary) return
    navigator.clipboard.writeText(report.summary).then(() => {
      setCopiedSummary(true)
      toast.success('Executive summary copied!', { title: 'Summary Copied' })
      setTimeout(() => setCopiedSummary(false), 1500)
    })
  }, [report?.summary])

  // ── Copy Link Handler ──────────────────────────────────────────
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true)
      toast.success('Public report link copied to clipboard!', { title: 'Link Copied' })
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }, [])

  const handleCopySourceUrl = useCallback((url, index) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrlIdx(index)
      toast.success(`Source link copied: ${extractDomain(url)}`, { title: 'URL Copied' })
      setTimeout(() => setCopiedUrlIdx(null), 1500)
    })
  }, [])

  // ── PDF Export Handler ─────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (!report) return
    setExporting(true)
    let iframe = null
    try {
      iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(
        buildPDFDocument({
          question: report.question,
          summary: report.summary,
          finalReport: normalizedReport,
          sources: report.sources,
          markedFn: (md) => marked(md, { gfm: true, breaks: true }),
        })
      )
      doc.close()

      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 1000)
      }, 500)
    } catch (err) {
      console.error('PDF export failed:', err)
      toast.error('Could not generate PDF print view. Please use Markdown export.', {
        title: 'PDF Export Failed',
      })
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
          <Logo size={24} />
        </div>

        <div className="topbar-right">
          <span className="topbar-badge">Public Report</span>
          <ThemeToggle />
          <button className="btn btn-primary btn-sm" onClick={onGoHome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LogoMark size={14} />
            <span>Open Assistant</span>
          </button>
        </div>
      </div>

      {/* ── Public Report Body ── */}
      <div className="public-report-container animate-in">
        {loading && (
          <div className="auth-splash" style={{ minHeight: '60vh' }}>
            <div className="auth-splash-inner">
              <LogoMark size={32} />
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
                    {report.sources.map((item, i) => {
                      const num = i + 1
                      const url = typeof item === 'string' ? item : item?.url || ''
                      const domain = (typeof item === 'object' && item?.domain) ? item.domain : extractDomain(url)
                      const score = typeof item === 'object' && item?.score ? item.score : null
                      const tier = typeof item === 'object' ? item?.tier : null
                      const authLabel = typeof item === 'object' ? item?.authority_label : null
                      const snippet = typeof item === 'object' ? item?.snippet : null
                      const signals = typeof item === 'object' && Array.isArray(item?.signals) ? item.signals : []
                      const step = typeof item === 'object' ? item?.step : ''
                      const favicon = getFaviconUrl(url)
                      const citeCount = citationCounts[num] || 0
                      const isExpanded = expandedExcerptIdx === i

                      return (
                        <li key={i} id={`public-source-${num}`} className="source-card-item">
                          <div className="source-card-header" style={{ flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                              <span className="source-card-domain" style={{ fontWeight: 600 }}>{domain}</span>

                              {/* Source Quality & Relevance Score Badge */}
                              {score !== null && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    backgroundColor:
                                      score >= 80
                                        ? 'rgba(16, 185, 129, 0.14)'
                                        : score >= 60
                                        ? 'rgba(6, 182, 212, 0.14)'
                                        : 'rgba(245, 158, 11, 0.14)',
                                    color:
                                      score >= 80
                                        ? '#10b981'
                                        : score >= 60
                                        ? '#06b6d4'
                                        : '#f59e0b',
                                    border: `1px solid ${
                                      score >= 80 ? '#10b98144' : score >= 60 ? '#06b6d444' : '#f59e0b44'
                                    }`,
                                  }}
                                  title={`Relevance Quality Score: ${score}% (${tier ? tier.toUpperCase() : 'QUALITY'})`}
                                >
                                  <Sparkles size={10} strokeWidth={2.2} />
                                  <span>{score}% Relevance</span>
                                </span>
                              )}

                              {/* Authority Label */}
                              {authLabel && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    color: 'var(--text-dim)',
                                    backgroundColor: 'var(--panel-alt)',
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                    border: '1px solid var(--border)',
                                  }}
                                >
                                  {authLabel}
                                </span>
                              )}

                              {citeCount > 0 && (
                                <span className="source-cite-chip" title={`Cited ${citeCount} times in this report`}>
                                  Cited {citeCount}x
                                </span>
                              )}
                            </div>

                            <div className="source-card-actions">
                              {snippet && (
                                <button
                                  type="button"
                                  className="source-action-icon-btn"
                                  onClick={() => setExpandedExcerptIdx(isExpanded ? null : i)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="View cited text snippet"
                                >
                                  {isExpanded ? <ChevronUp size={11} strokeWidth={2} /> : <ChevronDown size={11} strokeWidth={2} />}
                                  <span>{isExpanded ? 'Hide Excerpt' : 'Excerpt'}</span>
                                </button>
                              )}

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

                          {/* Expandable Cited Excerpt Drawer */}
                          {isExpanded && snippet && (
                            <div
                              className="source-excerpt-drawer animate-in"
                              style={{
                                marginTop: 10,
                                padding: '10px 14px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                fontSize: '12.5px',
                                lineHeight: 1.55,
                              }}
                            >
                              {step && (
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>
                                  Sub-Topic Query: "{step}"
                                </div>
                              )}
                              <div style={{ fontStyle: 'italic', color: 'var(--text)' }}>
                                "{snippet}"
                              </div>
                              {signals.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                  {signals.map((sig, sIdx) => (
                                    <span
                                      key={sIdx}
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        backgroundColor: 'var(--panel)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-faint)',
                                      }}
                                    >
                                      ✓ {sig}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* ── Suggested Follow-Up Questions (Explore Next) ── */}
              {report?.follow_up_questions && report.follow_up_questions.length > 0 && (
                <div className="follow-up-section" style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: 'rgba(124, 106, 240, 0.15)',
                          color: 'var(--violet)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Compass size={17} strokeWidth={2.2} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                          Explore Next Investigations
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                          AI-suggested research pathways based on these findings
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 9px',
                        borderRadius: 12,
                        backgroundColor: 'var(--panel-alt)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                      }}
                    >
                      {report.follow_up_questions.length} Directions
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                    {report.follow_up_questions.map((fq, fIdx) => {
                      const qText = typeof fq === 'string' ? fq : (fq?.question || '')
                      const category = typeof fq === 'object' && fq?.category ? fq.category : 'Deep Dive'
                      const rationale = typeof fq === 'object' && fq?.rationale ? fq.rationale : ''

                      const getCategoryStyle = (cat) => {
                        const lower = (cat || '').toLowerCase()
                        if (lower.includes('compar')) {
                          return { bg: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.28)' }
                        }
                        if (lower.includes('implement') || lower.includes('practic')) {
                          return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)' }
                        }
                        if (lower.includes('future') || lower.includes('outlook')) {
                          return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.28)' }
                        }
                        return { bg: 'rgba(124, 106, 240, 0.12)', color: 'var(--violet)', border: 'rgba(124, 106, 240, 0.28)' }
                      }

                      const catStyle = getCategoryStyle(category)
                      const isCopied = copiedFollowUpIdx === fIdx

                      return (
                        <div
                          key={fIdx}
                          className="follow-up-card"
                          style={{
                            padding: '16px',
                            backgroundColor: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 12,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  backgroundColor: catStyle.bg,
                                  color: catStyle.color,
                                  border: `1px solid ${catStyle.border}`,
                                  letterSpacing: '0.2px',
                                }}
                              >
                                {category}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleCopyFollowUp(qText, fIdx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: isCopied ? '#10b981' : 'var(--text-faint)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                                title="Copy question to clipboard"
                              >
                                {isCopied ? <Check size={12} strokeWidth={2.2} /> : <Copy size={12} strokeWidth={1.8} />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>
                              {qText}
                            </p>

                            {rationale && (
                              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                {rationale}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                            {onForkQuestion && (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => onForkQuestion(qText)}
                                style={{
                                  fontSize: '12.5px',
                                  padding: '7px 14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  borderRadius: 6,
                                  flex: 1,
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                }}
                              >
                                <span>Research This on Platform</span>
                                <ArrowRight size={13} strokeWidth={2.2} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Callout Banner */}
            <div className="public-cta-banner card" style={{ marginTop: '24px' }}>
              <div className="public-cta-content">
                <LogoMark size={36} />
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
