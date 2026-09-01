import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X,
  Send,
  Sparkles,
  Trash2,
  Bot,
  User as UserIcon,
  ShieldCheck,
  Zap,
  ArrowRight,
  Scale,
  BarChart2,
  FileQuestion,
} from 'lucide-react'
import {
  fetchReportChatHistory,
  sendReportChatMessageStream,
  clearReportChatHistory,
} from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { cleanThinkTags } from '../../utils/citations'

const QUICK_PROMPTS = [
  'Where do the sources disagree on key conclusions?',
  'What are the primary technical trade-offs identified?',
  'What are the unverified assumptions in this report?',
  'Extract all quantitative numbers & benchmarks into a table.',
]

export function ChatWithReportDrawer({
  runId,
  reportQuestion,
  initialPrompt,
  onClose,
  onOpenCitation,
}) {
  const { info: toastInfo, error: toastError } = useToast()
  const [messages, setMessages] = useState([])
  const [inputPrompt, setInputPrompt] = useState(initialPrompt || '')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load history on open
  useEffect(() => {
    if (!runId) return
    fetchReportChatHistory(runId)
      .then((res) => {
        if (res?.messages) setMessages(res.messages)
      })
      .catch((err) => {
        console.error('Failed to load chat history:', err)
      })
  }, [runId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Handle incoming initial prompt
  useEffect(() => {
    if (initialPrompt) {
      setInputPrompt(initialPrompt)
    }
  }, [initialPrompt])

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputPrompt).trim()
    if (!text || loading || !runId) return

    setInputPrompt('')
    const userMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setStreamingContent('')

    let currentAccumulated = ''

    await sendReportChatMessageStream(
      runId,
      text,
      messages.map((m) => ({ role: m.role, content: m.content })),
      (token) => {
        currentAccumulated += token
        setStreamingContent(currentAccumulated)
      },
      (sourcesReferenced) => {
        const assistantMsg = {
          id: `resp_${Date.now()}`,
          role: 'assistant',
          content: currentAccumulated,
          sources_referenced: sourcesReferenced,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreamingContent('')
        setLoading(false)
      },
      (err) => {
        toastError(err.message || 'Error streaming chat response.')
        setLoading(false)
        setStreamingContent('')
      }
    )
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all conversation history for this report?')) return
    try {
      await clearReportChatHistory(runId)
      setMessages([])
      toastInfo('Chat history cleared.')
    } catch (err) {
      toastError('Failed to clear chat history.')
    }
  }

  return (
    <div
      className="chat-drawer-overlay animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 600,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="chat-drawer-panel"
        style={{
          width: '100%',
          maxWidth: 520,
          height: '100%',
          backgroundColor: 'var(--panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-alt)',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--violet-soft)',
                color: 'var(--violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} strokeWidth={2.2} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap' }}>
                  Chat with Report
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                  }}
                >
                  Grounded RAG
                </span>
              </div>
              <p
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-dim)',
                  margin: '2px 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {reportQuestion}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {messages.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearHistory}
                title="Clear Chat History"
                style={{ padding: '5px 8px' }}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '5px 8px' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Message Thread Area */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && !streamingContent && (
            <div style={{ padding: '30px 10px', textAlign: 'center' }}>
              <Bot size={36} style={{ color: 'var(--violet)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                Ask Anything About This Study
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', maxWidth: 360, margin: '0 auto 20px' }}>
                Answers stream instantly grounded specifically in the gathered citations, PDF passports, and final synthesis.
              </p>

              {/* Quick Prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(qp)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--panel-alt)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--violet)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span>{qp}</span>
                    <ArrowRight size={13} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: isUser ? 'var(--violet)' : 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    color: isUser ? '#fff' : 'var(--violet)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isUser ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: isUser ? 'var(--violet-soft)' : 'var(--panel-alt)',
                    border: `1px solid ${isUser ? 'rgba(124, 106, 240, 0.3)' : 'var(--border)'}`,
                    color: 'var(--text)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  ) : (
                    <div className="report-markdown-content" style={{ fontSize: '13px' }}>
                      <Markdown remarkPlugins={[remarkGfm]}>{cleanThinkTags(m.content)}</Markdown>
                    </div>
                  )}

                  {/* Citation reference pills */}
                  {m.sources_referenced && m.sources_referenced.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>Citations:</span>
                      {m.sources_referenced.map((sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => onOpenCitation?.(sIdx)}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: 'var(--panel)',
                            border: '1px solid var(--border)',
                            color: 'var(--violet)',
                            cursor: 'pointer',
                          }}
                        >
                          [{sIdx}]
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Streaming Assistant Response */}
          {streamingContent && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'var(--panel-alt)',
                  border: '1px solid var(--border)',
                  color: 'var(--violet)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bot size={14} />
              </div>

              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: 'var(--panel-alt)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                <div className="report-markdown-content" style={{ fontSize: '13px' }}>
                  <Markdown remarkPlugins={[remarkGfm]}>{cleanThinkTags(streamingContent)}</Markdown>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--violet)', fontSize: '11.5px' }}>
                  <Sparkles size={12} className="animate-spin" /> Generating grounded answer...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--panel-alt)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="text"
              className="input-text"
              placeholder="Ask a follow-up question or request analysis..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !inputPrompt.trim()}
              style={{ padding: '9px 14px' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
