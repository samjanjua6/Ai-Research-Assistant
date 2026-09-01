import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  HelpCircle,
  ShieldCheck,
  BarChart2,
  MessageSquare,
  X,
  Check,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { explainTextSelection } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { cleanThinkTags } from '../../utils/citations'

export function TextSelectionPopover({ runId, onOpenChatWithPrompt, containerSelector = '.report-body, .tldr' }) {
  const { info: toastInfo, error: toastError, success: toastSuccess } = useToast()
  const [selectedText, setSelectedText] = useState('')
  const [position, setPosition] = useState(null)
  const [activeExplanation, setActiveExplanation] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        return
      }

      const anchorNode = selection.anchorNode
      const focusNode = selection.focusNode

      const isInsideReport = (node) => {
        if (!node) return false
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        return el ? Boolean(el.closest(containerSelector)) : false
      }

      // Strictly ensure the highlighted selection is inside the report container
      if (!isInsideReport(anchorNode) || !isInsideReport(focusNode)) {
        return
      }

      // Exclude interactive elements or code blocks
      const anchorEl = anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement
      if (anchorEl?.closest('button, input, textarea, select, .user-menu-wrapper, .sidebar, .topbar, .report-actions, .citation-badge, pre, code')) {
        return
      }

      const text = selection.toString().trim()
      if (text.length < 8) {
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      setSelectedText(text)
      setActiveExplanation(null)
      setPosition({
        top: rect.top + window.scrollY - 44,
        left: Math.max(10, rect.left + window.scrollX + rect.width / 2 - 140),
      })
    }

    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPosition(null)
        setActiveExplanation(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [containerSelector])

  const handleAction = async (action) => {
    if (!runId || !selectedText) return
    setLoadingAction(action)
    try {
      const res = await explainTextSelection(runId, selectedText, action)
      if (res?.explanation) {
        setActiveExplanation({
          action,
          text: res.explanation,
        })
      }
    } catch (err) {
      toastError(err.message || 'Failed to explain selection.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleCopyExplanation = () => {
    if (!activeExplanation?.text) return
    navigator.clipboard.writeText(activeExplanation.text).then(() => {
      setCopied(true)
      toastSuccess('Copied explanation to clipboard', { title: 'Copied' })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!position) return null

  const getActionBadge = (action) => {
    if (action === 'eli5') {
      return {
        label: 'Plain English (ELI5)',
        icon: <HelpCircle size={12} strokeWidth={2.2} />,
        bg: 'rgba(6, 182, 212, 0.12)',
        color: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.3)',
      }
    }
    if (action === 'evidence') {
      return {
        label: 'Evidentiary Basis & Citations',
        icon: <ShieldCheck size={12} strokeWidth={2.2} />,
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.3)',
      }
    }
    return {
      label: 'Quantitative Metrics & Benchmarks',
      icon: <BarChart2 size={12} strokeWidth={2.2} />,
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
    }
  }

  return (
    <div
      ref={popoverRef}
      className="text-selection-popover animate-in"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 550,
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--violet)',
        borderRadius: 10,
        padding: '6px 8px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(124, 106, 240, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 460,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Action Buttons Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('eli5')}
          disabled={loadingAction !== null}
          title="Explain in plain English (ELI5)"
          style={{
            padding: '4px 8px',
            fontSize: '11.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            backgroundColor: loadingAction === 'eli5' ? 'rgba(6, 182, 212, 0.18)' : undefined,
          }}
        >
          <HelpCircle size={13} style={{ color: '#06b6d4' }} strokeWidth={2.2} />
          {loadingAction === 'eli5' ? 'Explaining…' : 'Explain'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('evidence')}
          disabled={loadingAction !== null}
          title="Find evidentiary support & check conflicting citations"
          style={{
            padding: '4px 8px',
            fontSize: '11.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            backgroundColor: loadingAction === 'evidence' ? 'rgba(16, 185, 129, 0.18)' : undefined,
          }}
        >
          <ShieldCheck size={13} style={{ color: '#10b981' }} strokeWidth={2.2} />
          {loadingAction === 'evidence' ? 'Verifying…' : 'Evidence'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('metrics')}
          disabled={loadingAction !== null}
          title="Extract quantitative metrics, percentages & benchmarks"
          style={{
            padding: '4px 8px',
            fontSize: '11.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            backgroundColor: loadingAction === 'metrics' ? 'rgba(245, 158, 11, 0.18)' : undefined,
          }}
        >
          <BarChart2 size={13} style={{ color: '#f59e0b' }} strokeWidth={2.2} />
          {loadingAction === 'metrics' ? 'Extracting…' : 'Metrics'}
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onOpenChatWithPrompt?.(`Regarding this highlighted passage:\n"${selectedText}"\n\nCould you elaborate further on its implications?`)
            setPosition(null)
          }}
          title="Ask custom question in chat drawer"
          style={{
            padding: '4px 9px',
            fontSize: '11.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontWeight: 600,
          }}
        >
          <MessageSquare size={13} strokeWidth={2.2} />
          Ask in Chat
        </button>

        <button
          type="button"
          onClick={() => setPosition(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            padding: '3px',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: 'auto',
          }}
          title="Close popover"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Inline Popover Explanation Result */}
      {activeExplanation && (
        <div
          className="animate-in"
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: 'var(--text)',
            maxHeight: 260,
            overflowY: 'auto',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          {/* Header row with badge & actions */}
          {(() => {
            const badge = getActionBadge(activeExplanation.action)
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--border)',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    letterSpacing: '0.2px',
                  }}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleCopyExplanation}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copied ? '#10b981' : 'var(--text-dim)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                    title="Copy explanation markdown"
                  >
                    {copied ? <Check size={12} strokeWidth={2.2} /> : <Copy size={12} strokeWidth={1.8} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      onOpenChatWithPrompt?.(`Regarding this passage:\n"${selectedText}"\n\n${activeExplanation.text}`)
                      setPosition(null)
                    }}
                    style={{
                      fontSize: '11px',
                      color: 'var(--violet)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <span>Continue in Chat</span>
                    <ArrowRight size={11} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Formatted Markdown Content */}
          <div className="popover-markdown-content" style={{ fontSize: '12.5px', color: 'var(--text)' }}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p style={{ margin: '0 0 8px 0', lineHeight: 1.55, fontSize: '12.5px', color: 'var(--text)' }}>
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: '#c4b5fd', fontWeight: 700 }}>
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: '#e2e8f0', fontStyle: 'italic' }}>
                    {children}
                  </em>
                ),
                ul: ({ children }) => (
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: 18, listStyleType: 'disc' }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ margin: '4px 0 8px 0', paddingLeft: 18, listStyleType: 'decimal' }}>
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: 4, lineHeight: 1.5, fontSize: '12px', color: 'var(--text)' }}>
                    {children}
                  </li>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0 4px 0', color: '#f8fafc' }}>
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 style={{ fontSize: '12px', fontWeight: 700, margin: '6px 0 3px 0', color: '#f8fafc' }}>
                    {children}
                  </h4>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      backgroundColor: 'rgba(124, 106, 240, 0.15)',
                      color: '#c4b5fd',
                      padding: '2px 5px',
                      borderRadius: 4,
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    style={{
                      margin: '6px 0',
                      paddingLeft: 10,
                      borderLeft: '2px solid var(--violet)',
                      color: 'var(--text-dim)',
                      fontStyle: 'italic',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {cleanThinkTags(activeExplanation.text)}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  )
}
