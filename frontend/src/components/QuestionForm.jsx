import { useState, useCallback, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { uploadDocument } from '../api/client'
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

export default function QuestionForm({ onSubmit, onStop, isLoading, error, initialQuestion }) {
  const [value, setValue] = useState(initialQuestion || '')
  const [attachedDocs, setAttachedDocs] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (initialQuestion) {
      setValue(initialQuestion)
    }
  }, [initialQuestion])

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

  const handleSubmit = useCallback(() => {
    const q = value.trim()
    if (!q || isLoading) return
    if (attachedDocs.length > 0) {
      onSubmit({ question: q, documents: attachedDocs })
    } else {
      onSubmit(q)
    }
  }, [value, attachedDocs, isLoading, onSubmit])

  const handleRetry = useCallback(() => {
    const q = value.trim()
    if (!q) return
    if (attachedDocs.length > 0) {
      onSubmit({ question: q, documents: attachedDocs })
    } else {
      onSubmit(q)
    }
  }, [value, attachedDocs, onSubmit])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="eyebrow" style={{ margin: 0 }}>Ask a research question</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
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
            {isUploading ? 'Parsing document…' : attachedDocs.length > 0 ? `Attach more (${attachedDocs.length}/3)` : 'Attach context (PDF/DOCX)'}
          </span>
        </button>
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
