import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Sparkles,
  Square,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Microscope,
  GitCompare,
  ShieldAlert,
  Lightbulb,
  Users,
  Network,
  History,
  Paperclip,
  FileText,
  X,
  Loader2,
  UploadCloud,
  Link2,
  Globe,
  Zap,
  ExternalLink,
} from 'lucide-react'
import { uploadDocument, fetchUrlContext } from '../api/client'
import { toast } from '../context/ToastContext'

const COMMAND_LENSES = [
  { id: 'deep', label: 'Deep Dive', prefix: '/DEEP', Icon: Microscope, placeholder: '"Topic to analyze in depth"' },
  { id: 'angle', label: 'Compare', prefix: '/ANGLE', Icon: GitCompare, placeholder: '"Tech A" vs "Tech B"' },
  { id: 'challenge', label: 'Stress Test', prefix: '/CHALLENGE', Icon: ShieldAlert, placeholder: '"Topic to find contradictions & white spots"' },
  { id: 'hyp', label: 'Hypotheses', prefix: '/HYP', Icon: Lightbulb, placeholder: '"Frontier domain for non-obvious hypotheses"' },
  { id: 'voices', label: 'Stakeholders', prefix: '/VOICES', Icon: Users, placeholder: '"Topic to map stakeholder positions"' },
  { id: 'artefact', label: 'Mind-Map', prefix: '/ARTEFACT mind-map', Icon: Network, placeholder: '"Topic for Mermaid concept hierarchy"' },
  { id: 'timeline', label: 'Timeline', prefix: '/TIMELINE', Icon: History, placeholder: '"Evolution & milestones of topic"' },
]

const PLACEHOLDER_PATTERNS = [
  'topic to analyze in depth',
  'tech a',
  'tech b',
  'topic to find contradictions',
  'frontier domain for non-obvious',
  'topic to map stakeholder',
  'topic for mermaid concept',
  'evolution & milestones',
  'alternative',
]

export default function QuestionForm({
  onSubmit,
  onStop,
  isLoading,
  error,
  initialQuestion,
  question,
  onQuestionChange,
  engine: propEngine,
  onEngineChange,
}) {
  const [localValue, setLocalValue] = useState(initialQuestion || question || '')
  const [localEngine, setLocalEngine] = useState('langgraph')
  const [attachedDocs, setAttachedDocs] = useState([])
  const [attachedUrls, setAttachedUrls] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)

  const value = question !== undefined ? question : localValue
  const setValue = onQuestionChange || setLocalValue

  const engine = propEngine !== undefined ? propEngine : localEngine
  const setEngine = (newEng) => {
    setLocalEngine(newEng)
    if (onEngineChange) onEngineChange(newEng)
  }

  const fileInputRef = useRef(null)
  const urlInputRef = useRef(null)

  useEffect(() => {
    if (initialQuestion !== undefined) {
      setValue(initialQuestion)
    }
  }, [initialQuestion])

  // Detect unattached URLs typed or pasted in question textarea
  const detectedUrl = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/i
    const match = value.match(urlRegex)
    if (!match) return null
    const foundUrl = match[0].replace(/[),;.!?]+$/, '')
    const alreadyAttached = attachedUrls.some((u) => u.url.toLowerCase() === foundUrl.toLowerCase())
    return alreadyAttached ? null : foundUrl
  }, [value, attachedUrls])

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)

    if (attachedDocs.length + fileList.length > 3) {
      toast.warning('Maximum 3 attached documents allowed per research run.', { title: 'Upload Limit' })
      return
    }

    setIsUploading(true)
    for (const file of fileList) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds the 25MB limit.`, { title: 'File Too Large' })
        continue
      }

      try {
        const docPassport = await uploadDocument(file)
        setAttachedDocs((prev) => [...prev, docPassport])
        toast.success(`Attached "${docPassport.filename}" (${docPassport.page_count} pages, ${docPassport.word_count.toLocaleString()} words)`, {
          title: 'Document Grounded',
        })
      } catch (err) {
        toast.error(err.message || `Failed to process ${file.name}`, { title: 'Upload Error' })
      }
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveDoc = (docId) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  const handleAddUrl = async (urlToAdd) => {
    const target = (urlToAdd || urlInputValue).trim()
    if (!target) return
    if (attachedUrls.length >= 3) {
      toast.warning('Maximum 3 URL references allowed per research run.', { title: 'URL Limit' })
      return
    }

    setIsFetchingUrl(true)
    try {
      const passport = await fetchUrlContext(target)
      setAttachedUrls((prev) => [...prev, passport])
      setUrlInputValue('')
      setShowUrlInput(false)
      toast.success(`Attached "${passport.title}" (${passport.word_count.toLocaleString()} words)`, {
        title: 'URL Grounded',
      })
    } catch (err) {
      toast.error(err.message || 'Failed to extract content from URL', { title: 'URL Fetch Error' })
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleRemoveUrl = (urlId) => {
    setAttachedUrls((prev) => prev.filter((u) => u.id !== urlId))
  }

  const handleSubmit = useCallback(() => {
    const q = value.trim()
    if (!q || isLoading) return
    const payload = { question: q, engine }
    if (attachedDocs.length > 0) payload.documents = attachedDocs
    if (attachedUrls.length > 0) payload.urls = attachedUrls
    onSubmit(payload)
  }, [value, attachedDocs, attachedUrls, engine, isLoading, onSubmit])

  const handleRetry = useCallback(() => {
    const q = value.trim()
    if (!q) return
    const payload = { question: q, engine }
    if (attachedDocs.length > 0) payload.documents = attachedDocs
    if (attachedUrls.length > 0) payload.urls = attachedUrls
    onSubmit(payload)
  }, [value, attachedDocs, attachedUrls, engine, onSubmit])

  const handleSelectLens = (lens) => {
    const current = value.trim()
    // Strip existing slash command prefix
    const body = current.replace(/^\/(?:DEEP|ANGLE|CHALLENGE|HYP|VOICES|ARTEFACT(?:\s+[a-zA-Z0-9_-]+)?|TIMELINE|MIX|SCAN)\s*/i, '').trim()

    // Check if the current body is empty or just contains generic placeholder strings
    const isPlaceholder = !body || PLACEHOLDER_PATTERNS.some((p) => body.toLowerCase().includes(p))

    if (isPlaceholder) {
      setValue(`${lens.prefix} ${lens.placeholder}`)
      return
    }

    if (lens.prefix === '/ANGLE') {
      if (/\b(?:vs\.?|versus|against)\b/i.test(body)) {
        setValue(`/ANGLE ${body}`)
      } else {
        const cleanTopic = body.replace(/^"|"$/g, '').trim()
        setValue(`/ANGLE "${cleanTopic}" vs "Alternative"`)
      }
    } else {
      // Switching to a single-topic lens: strip 'vs ...' if coming from an angle comparison
      let singleTopic = body
      if (/\b(?:vs\.?|versus|against)\b/i.test(body)) {
        singleTopic = body.split(/\b(?:vs\.?|versus|against)\b/i)[0].trim()
      }
      singleTopic = singleTopic.replace(/^"|"$/g, '').trim()
      setValue(`${lens.prefix} "${singleTopic}"`)
    }
  }

  return (
    <div
      className={`card ${isDragging ? 'dropzone-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
      }}
      style={{
        border: isDragging ? '1px dashed var(--violet)' : undefined,
        backgroundColor: isDragging ? 'rgba(124, 106, 240, 0.04)' : undefined,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
        <div className="eyebrow" style={{ margin: 0 }}>Ask a research question</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* URL Input Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowUrlInput((prev) => !prev)
              setTimeout(() => urlInputRef.current?.focus(), 50)
            }}
            disabled={isLoading || isFetchingUrl || attachedUrls.length >= 3}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: attachedUrls.length > 0 ? 'rgba(2, 132, 199, 0.12)' : 'var(--panel-alt)',
              border: `1px solid ${attachedUrls.length > 0 ? 'rgba(2, 132, 199, 0.35)' : 'var(--border)'}`,
              color: attachedUrls.length > 0 ? '#0284c7' : 'var(--text-dim)',
              cursor: attachedUrls.length >= 3 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Paste a web URL (arXiv, GitHub, Wikipedia, blog) to ground research in live web content"
          >
            {isFetchingUrl ? <Loader2 size={12} className="spinner" /> : <Link2 size={12} />}
            <span>
              {isFetchingUrl ? 'Fetching URL…' : attachedUrls.length > 0 ? `URLs (${attachedUrls.length}/3)` : 'Paste URL'}
            </span>
          </button>

          {/* Document Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading || attachedDocs.length >= 3}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: attachedDocs.length > 0 ? 'rgba(124, 106, 240, 0.12)' : 'var(--panel-alt)',
              border: `1px solid ${attachedDocs.length > 0 ? 'rgba(124, 106, 240, 0.3)' : 'var(--border)'}`,
              color: attachedDocs.length > 0 ? 'var(--violet)' : 'var(--text-dim)',
              cursor: attachedDocs.length >= 3 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Upload PDF, DOCX, TXT, or MD to ground research in your document"
          >
            {isUploading ? <Loader2 size={12} className="spinner" /> : <Paperclip size={12} />}
            <span>
              {isUploading ? 'Parsing document…' : attachedDocs.length > 0 ? `Files (${attachedDocs.length}/3)` : 'Attach file'}
            </span>
          </button>
        </div>
      </div>

      <textarea
        className="question-textarea question-input"
        placeholder="e.g. /DEEP What are the latest breakthroughs in neutral atom quantum computing?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
        disabled={isLoading}
        rows={4}
      />

      {/* ── Inline URL Input Popover Bar ── */}
      {showUrlInput && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid rgba(2, 132, 199, 0.35)',
            borderRadius: 8,
          }}
        >
          <Globe size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
          <input
            ref={urlInputRef}
            type="url"
            placeholder="Paste URL e.g. https://arxiv.org/abs/... or https://github.com/..."
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl() } }}
            disabled={isFetchingUrl}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              color: 'var(--text)',
            }}
          />
          <button
            type="button"
            onClick={() => handleAddUrl()}
            disabled={isFetchingUrl || !urlInputValue.trim()}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              cursor: isFetchingUrl || !urlInputValue.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isFetchingUrl ? <Loader2 size={11} className="spinner" /> : null}
            <span>Add URL</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlInput(false); setUrlInputValue('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Auto-detected URL Suggestion Chip ── */}
      {detectedUrl && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 10px',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px dashed rgba(2, 132, 199, 0.4)',
            borderRadius: 6,
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <Zap size={12} style={{ color: '#0284c7', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-dim)' }}>Detected URL in question:</span>
            <span style={{ fontWeight: 600, color: '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {detectedUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleAddUrl(detectedUrl)}
            disabled={isFetchingUrl}
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isFetchingUrl ? <Loader2 size={10} className="spinner" /> : null}
            <span>Ground Context</span>
          </button>
        </div>
      )}

      {/* ── Attached URL Passports ── */}
      {attachedUrls.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachedUrls.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                backgroundColor: 'var(--panel-alt)',
                border: '1px solid rgba(2, 132, 199, 0.35)',
                borderRadius: 6,
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <Globe size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                  {u.title}
                </span>
                <span style={{ fontSize: '10px', color: '#0284c7', padding: '1px 5px', backgroundColor: 'rgba(2, 132, 199, 0.08)', borderRadius: 4, border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                  {u.domain} · {u.word_count.toLocaleString()} words
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveUrl(u.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove attached URL"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Attached Document Passports ── */}
      {attachedDocs.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachedDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                backgroundColor: 'var(--panel-alt)',
                border: '1px solid rgba(124, 106, 240, 0.28)',
                borderRadius: 6,
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <FileText size={13} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                  {doc.filename}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '1px 5px', backgroundColor: 'var(--panel)', borderRadius: 4, border: '1px solid var(--border)' }}>
                  {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'} · {doc.word_count.toLocaleString()} words
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveDoc(doc.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove attached document"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Multi-Agent Engine Selector Bar ── */}
      <div
        style={{
          marginTop: 10,
          padding: '7px 10px',
          backgroundColor: 'var(--panel-alt)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Multi-Agent Engine
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>
            Select execution paradigm
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className={`engine-pill-btn ${engine === 'langgraph' ? 'active' : ''}`}
            onClick={() => setEngine('langgraph')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer',
              border: engine === 'langgraph' ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid var(--border)',
              backgroundColor: engine === 'langgraph' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
              color: engine === 'langgraph' ? '#06b6d4' : 'var(--text-dim)',
              transition: 'all 0.15s ease',
            }}
            title="LangGraph StateGraph (Fast deterministic state machine with token-by-token streaming)"
          >
            <Zap size={11} strokeWidth={2.2} />
            <span>LangGraph (Fast)</span>
          </button>

          <button
            type="button"
            className={`engine-pill-btn ${engine === 'crewai' ? 'active' : ''}`}
            onClick={() => setEngine('crewai')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer',
              border: engine === 'crewai' ? '1px solid rgba(124, 106, 240, 0.5)' : '1px solid var(--border)',
              backgroundColor: engine === 'crewai' ? 'rgba(124, 106, 240, 0.12)' : 'transparent',
              color: engine === 'crewai' ? 'var(--violet)' : 'var(--text-dim)',
              transition: 'all 0.15s ease',
            }}
            title="CrewAI 4-Agent Team (Methodologist, Scout, Synthesizer, Auditor)"
          >
            <Users size={11} strokeWidth={2.2} />
            <span>CrewAI (4 Agents)</span>
          </button>
        </div>
      </div>

      {/* ── Methodologist Command-Lens Selector Bar ── */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Analytical Command Lenses
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Select lens to direct research angle
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COMMAND_LENSES.map((l) => {
            const isActive = value.trim().toUpperCase().startsWith(l.prefix.toUpperCase())
            const Icon = l.Icon
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelectLens(l)}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isActive ? 'var(--violet)' : 'var(--border)'}`,
                  backgroundColor: isActive ? 'rgba(124, 106, 240, 0.12)' : 'var(--panel-alt)',
                  color: isActive ? 'var(--violet)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                title={`Apply ${l.prefix} analytical lens`}
              >
                <Icon size={13} strokeWidth={2} />
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="question-tip" style={{ marginTop: 8 }}>Tip: Press Ctrl + Enter (or Cmd + Enter) to run</div>

      <div className="form-actions">
        {isLoading ? (
          <div className="button-group">
            <button className="run-btn running-btn" disabled>
              <span className="spinner" /> Researching…
            </button>
            <button
              className="stop-btn"
              onClick={onStop}
              type="button"
              title="Stop research agent"
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>
          </div>
        ) : (
          <button
            className="run-btn"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            <Sparkles size={14} strokeWidth={2} />
            <span>Run research</span>
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-text">
            <AlertTriangle size={14} strokeWidth={2} className="inline-icon" /> {error}
          </div>
          <button
            className="retry-btn-inline"
            onClick={handleRetry}
            disabled={isLoading || !value.trim()}
          >
            <RotateCcw size={12} strokeWidth={2} /> Retry
          </button>
        </div>
      )}
    </div>
  )
}
