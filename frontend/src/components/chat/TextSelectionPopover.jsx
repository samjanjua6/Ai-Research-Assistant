import { useState, useEffect, useRef } from 'react'
import { Sparkles, HelpCircle, ShieldCheck, BarChart2, MessageSquare, X, Check } from 'lucide-react'
import { explainTextSelection } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export function TextSelectionPopover({ runId, onOpenChatWithPrompt }) {
  const { info: toastInfo, error: toastError } = useToast()
  const [selectedText, setSelectedText] = useState('')
  const [position, setPosition] = useState(null)
  const [activeExplanation, setActiveExplanation] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        // If clicking inside the popover itself, keep it open
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
  }, [])

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

  if (!position) return null

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
        borderRadius: 8,
        padding: '4px 6px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxWidth: 380,
      }}
    >
      {/* Action Buttons Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('eli5')}
          disabled={loadingAction !== null}
          title="Explain in plain English (ELI5)"
          style={{ padding: '4px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <HelpCircle size={12} style={{ color: '#06b6d4' }} />
          {loadingAction === 'eli5' ? 'Explaining...' : 'Explain'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('evidence')}
          disabled={loadingAction !== null}
          title="Find evidence and citations for this claim"
          style={{ padding: '4px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <ShieldCheck size={12} style={{ color: '#10b981' }} />
          {loadingAction === 'evidence' ? 'Verifying...' : 'Evidence'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAction('metrics')}
          disabled={loadingAction !== null}
          title="Extract quantitative numbers and metrics"
          style={{ padding: '4px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <BarChart2 size={12} style={{ color: '#f59e0b' }} />
          {loadingAction === 'metrics' ? 'Extracting...' : 'Metrics'}
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onOpenChatWithPrompt?.(`Regarding this highlighted passage:\n"${selectedText}"\n\nCould you elaborate further on its implications?`)
            setPosition(null)
          }}
          title="Ask custom question in chat"
          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <MessageSquare size={12} />
          Ask in Chat
        </button>

        <button
          type="button"
          onClick={() => setPosition(null)}
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2 }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Inline Popover Explanation Result */}
      {activeExplanation && (
        <div
          className="animate-in"
          style={{
            padding: '10px',
            backgroundColor: 'var(--panel-alt)',
            borderRadius: 6,
            fontSize: '12px',
            lineHeight: 1.45,
            color: 'var(--text)',
            maxHeight: 200,
            overflowY: 'auto',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase' }}>
              {activeExplanation.action === 'eli5' ? 'Plain English Explanation' : activeExplanation.action === 'evidence' ? 'Evidentiary Basis' : 'Extracted Metrics'}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                onOpenChatWithPrompt?.(`Regarding this passage:\n"${selectedText}"\n\n${activeExplanation.text}`)
                setPosition(null)
              }}
              style={{ fontSize: '10.5px' }}
            >
              Continue in Chat →
            </button>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activeExplanation.text}</p>
        </div>
      )}
    </div>
  )
}
