import { useState, useCallback, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ShareModal } from './ShareModal'

function normalizeMarkdown(text) {
  if (!text) return ''
  let cleaned = text
  cleaned = cleaned.replace(/\|[ \t]*\|(?=[:\-])/g, '|\n|')
  cleaned = cleaned.replace(/\|[ \t]*\|(?=[^\n|:\-])/g, '|\n|')
  cleaned = cleaned.replace(/([^\n])\n(\|[^\n]+\|\r?\n\|[-: |]+\|)/g, '$1\n\n$2')
  return cleaned
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
  const reportHtml = markedFn(finalReport || '')
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const summaryHtml = summary
    ? `<div class="tldr-box">
        <div class="tldr-label">TL;DR</div>
        <p class="tldr-text">${escapeHtml(summary)}</p>
       </div>`
    : ''

  const sourcesHtml = sources?.length
    ? `<div class="sources-section">
        <div class="section-label">Sources</div>
        <ol class="sources-list">
          ${sources.map(url => `<li><span>${escapeHtml(url)}</span></li>`).join('')}
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
/* ── Base ─────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.75;
  color: #1a1a2e;
  background: #fff;
}

/* ── Print page setup ─────────────────────────────────────────── */
@page {
  size: A4;
  margin: 0;
}
@media print {
  html, body { width: 210mm; }
  /* Force background colours & images to print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .pdf-cover {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  /* Avoid page breaks inside key elements */
  .tldr-box, .sources-section, table, pre, blockquote {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
}

/* ── Cover ────────────────────────────────────────────────────── */
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
  margin-bottom: 20px;
}
.cover-question {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 22pt;
  font-weight: 700;
  color: #fff;
  line-height: 1.25;
  margin-bottom: 28px;
  letter-spacing: -0.015em;
}
.cover-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.chip {
  font-family: 'Courier New', monospace;
  font-size: 8.5pt;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.22);
  color: rgba(255,255,255,.85);
  padding: 4px 13px;
  border-radius: 3px;
}

/* ── Body wrapper ─────────────────────────────────────────────── */
.pdf-body { padding: 40px 48px 52px; }

/* ── TL;DR ────────────────────────────────────────────────────── */
.tldr-box {
  background: #f0edff;
  border-left: 4px solid #7c6af0;
  border-radius: 3px;
  padding: 16px 20px;
  margin-bottom: 30px;
}
.tldr-label {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 7.5pt;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7c6af0;
  margin-bottom: 8px;
}
.tldr-text { font-size: 10.5pt; color: #2d2d5e; line-height: 1.65; }

/* ── Report headings ──────────────────────────────────────────── */
.report-content h1 {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 17pt; font-weight: 700; color: #0f0c29;
  margin: 30px 0 12px;
  padding-bottom: 7px;
  border-bottom: 2px solid #e6e0ff;
}
.report-content h2 {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 13pt; font-weight: 700; color: #1a1a3e;
  margin: 24px 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eeeaff;
}
.report-content h3 {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 11.5pt; font-weight: 700; color: #2d2d5e;
  margin: 18px 0 8px;
}
.report-content h4, .report-content h5, .report-content h6 {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 10.5pt; font-weight: 600; color: #3d3d70;
  margin: 14px 0 6px;
}
.report-content p { margin-bottom: 13px; }
.report-content ul, .report-content ol { margin: 8px 0 14px 22px; }
.report-content li { margin-bottom: 5px; }
.report-content strong { font-weight: 700; color: #0f0c29; }
.report-content em { font-style: italic; }

/* ── Code ─────────────────────────────────────────────────────── */
.report-content code {
  font-family: 'Courier New', monospace;
  font-size: 9pt;
  background: #f0edff;
  color: #5a4fd0;
  padding: 2px 5px;
  border-radius: 3px;
}
.report-content pre {
  background: #f6f4ff;
  border: 1px solid #e0d8ff;
  border-radius: 5px;
  padding: 14px 16px;
  margin: 14px 0;
  overflow-x: auto;
}
.report-content pre code {
  background: none; color: #2d2d5e; padding: 0; font-size: 9pt;
}

/* ── Blockquote & HR ──────────────────────────────────────────── */
.report-content blockquote {
  border-left: 3px solid #7c6af0;
  margin: 14px 0;
  padding: 8px 16px;
  background: #f8f6ff;
  color: #4a4a7a;
  font-style: italic;
  border-radius: 0 3px 3px 0;
}
.report-content hr {
  border: none; border-top: 1px solid #e6e0ff; margin: 24px 0;
}

/* ── Tables ───────────────────────────────────────────────────── */
.report-content table {
  width: 100%; border-collapse: collapse;
  margin: 18px 0; font-size: 9.5pt;
}
.report-content th {
  background: #7c6af0;
  color: #fff;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 700; font-size: 8.5pt;
  letter-spacing: 0.03em;
  padding: 9px 12px; text-align: left;
}
.report-content td {
  padding: 8px 12px;
  border-bottom: 1px solid #e8e4ff;
  vertical-align: top;
}
.report-content tr:nth-child(even) td { background: #f8f6ff; }
.report-content tr:last-child td { border-bottom: none; }

/* ── Sources ──────────────────────────────────────────────────── */
.section-label {
  display: block;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 8pt; font-weight: 800;
  letter-spacing: 0.15em; text-transform: uppercase;
  color: #7c6af0; margin-bottom: 12px;
}
.sources-section {
  margin-top: 36px; padding-top: 22px;
  border-top: 2px solid #e6e0ff;
}
.sources-list { margin: 0 0 0 18px; }
.sources-list li {
  margin-bottom: 5px;
  font-family: 'Courier New', monospace;
  font-size: 8pt; color: #5a4fd0;
  word-break: break-all;
}

/* ── Footer ───────────────────────────────────────────────────── */
.pdf-footer {
  margin-top: 44px; padding-top: 14px;
  border-top: 1px solid #eeeaff;
  text-align: center;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-size: 7.5pt; color: #b0aed0;
}
</style>
</head>
<body>

<div class="pdf-cover">
  <div class="cover-app">🔬 &nbsp; Research Assistant &nbsp;·&nbsp; AI-Generated Report</div>
  <div class="cover-question">${escapeHtml(question || 'Research Report')}</div>
  <div class="cover-chips">
    <span class="chip">📅 ${date}</span>
    ${sources?.length ? `<span class="chip">🔗 ${sources.length} source${sources.length !== 1 ? 's' : ''}</span>` : ''}
    <span class="chip">⚡ Powered by LangGraph</span>
  </div>
</div>

<div class="pdf-body">
  ${summaryHtml}
  <div class="report-content">
    ${reportHtml}
  </div>
  ${sourcesHtml}
  <div class="pdf-footer">
    Generated by Research Assistant &nbsp;·&nbsp; research.mychatbot.codes &nbsp;·&nbsp; ${date}
  </div>
</div>

</body>
</html>`
}

export default function ReportPanel({ report, question, runId }) {
  const [copied,    setCopied]    = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const normalizedReport = useMemo(() => {
    return normalizeMarkdown(report?.final_report || '')
  }, [report?.final_report])

  // ── Copy ──────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report.final_report || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [report.final_report])

  // ── Download .md ──────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const content = [
      '# Research Report\n',
      report.summary ? `## Executive Summary\n${report.summary}\n` : '',
      report.final_report || '',
      (report.sources?.length)
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
        question:    question || '',
        summary:     report.summary,
        finalReport: normalizedReport,
        sources:     report.sources || [],
        markedFn:    marked,
      })

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)

      iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;top:-1px;left:-1px;width:1px;height:1px;' +
        'border:none;opacity:0;pointer-events:none;'
      document.body.appendChild(iframe)

      await new Promise((resolve, reject) => {
        iframe.onload  = () => setTimeout(resolve, 700)
        iframe.onerror = reject
        iframe.src = blobUrl
      })

      iframe.contentWindow.focus()
      iframe.contentWindow.print()

      const cleanup = () => {
        try { if (iframe) document.body.removeChild(iframe) } catch (_) {}
        try { if (blobUrl) URL.revokeObjectURL(blobUrl) } catch (_) {}
        iframe  = null
        blobUrl = null
      }
      try { iframe.contentWindow.addEventListener('afterprint', cleanup) } catch (_) {}
      setTimeout(cleanup, 60_000)

    } catch (err) {
      console.error('PDF export failed:', err)
      try { if (iframe) document.body.removeChild(iframe) } catch (_) {}
      try { if (blobUrl) URL.revokeObjectURL(blobUrl) }   catch (_) {}
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
            {exporting
              ? <><span className="pdf-spinner" />Generating…</>
              : <>📄 Export PDF</>}
          </button>

          <button className="copy-btn" onClick={handleDownload} title="Download as Markdown">
            📥 Download .md
          </button>

          <button className="copy-btn" onClick={handleCopy} title="Copy to clipboard">
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {report.summary && (
        <div className="tldr">
          <div className="eyebrow">TL;DR</div>
          <p>{report.summary}</p>
        </div>
      )}

      <div className="report-body" id="reportBody">
        <Markdown remarkPlugins={[remarkGfm]}>{normalizedReport}</Markdown>
      </div>

      {report.sources?.length > 0 && (
        <div className="sources-section">
          <span className="eyebrow">Sources</span>
          <ul className="sources-list">
            {report.sources.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  [{i + 1}] {url}
                </a>
              </li>
            ))}
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
