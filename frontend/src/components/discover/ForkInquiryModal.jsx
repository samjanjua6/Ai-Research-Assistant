import { useState, useMemo } from 'react'
import {
  GitFork,
  Scale,
  Layers,
  Sparkles,
  FlaskConical,
  Users,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { forkReportInquiry } from '../../api/client'
import { toast } from '../../context/ToastContext'

const LENS_OPTIONS = [
  {
    id: '/CHALLENGE',
    label: 'Adversarial Audit (/CHALLENGE)',
    icon: Scale,
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    desc: 'Attacks core premises, surfaces counter-arguments, failure modes, and industry skepticism.',
    mutate: (cleanQ) => `/CHALLENGE "${cleanQ}"`,
  },
  {
    id: '/ANGLE',
    label: 'Comparative Matrix (/ANGLE)',
    icon: Layers,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    desc: 'Directly compares this approach against an alternative paradigm or competitor.',
    mutate: (cleanQ) => `/ANGLE "${cleanQ}" vs alternative paradigms`,
  },
  {
    id: '/DEEP',
    label: 'Exhaustive Deep Dive (/DEEP)',
    icon: Sparkles,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    desc: 'Deep multi-loop investigation with mathematical, architectural, and empirical rigor.',
    mutate: (cleanQ) => `/DEEP "${cleanQ}"`,
  },
  {
    id: '/HYP',
    label: 'Empirical Hypotheses (/HYP)',
    icon: FlaskConical,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    desc: 'Formulates falsifiable scientific predictions and experimental validation protocols.',
    mutate: (cleanQ) => `/HYP "${cleanQ}"`,
  },
  {
    id: '/VOICES',
    label: 'Stakeholder Perspectives (/VOICES)',
    icon: Users,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    desc: 'Synthesizes enterprise, regulator, engineer, and investor perspectives.',
    mutate: (cleanQ) => `/VOICES "${cleanQ}"`,
  },
]

export function ForkInquiryModal({ report, onClose, onLaunchFork }) {
  const [selectedLens, setSelectedLens] = useState('/CHALLENGE')
  const [engine, setEngine] = useState('langgraph')
  const [customPrompt, setCustomPrompt] = useState('')
  const [forking, setForking] = useState(false)

  // Strip existing command lens from original question
  const cleanOriginalQuestion = useMemo(() => {
    if (!report?.question) return ''
    return report.question.replace(/^\/[A-Z]+\s+/, '').replace(/^["']|["']$/g, '').trim()
  }, [report?.question])

  // Default mutated prompt based on selected lens
  const currentLensObj = useMemo(() => {
    return LENS_OPTIONS.find((l) => l.id === selectedLens) || LENS_OPTIONS[0]
  }, [selectedLens])

  const suggestedPrompt = useMemo(() => {
    return currentLensObj.mutate(cleanOriginalQuestion)
  }, [currentLensObj, cleanOriginalQuestion])

  const effectivePrompt = customPrompt.trim() || suggestedPrompt

  const handleLaunch = async () => {
    if (!effectivePrompt) return
    setForking(true)
    try {
      if (report?.id) {
        await forkReportInquiry(report.id, selectedLens, effectivePrompt).catch(() => {})
      }
      toast.success('Inquiry forked! Pre-filling into research workspace.')
      onLaunchFork(effectivePrompt, engine, report?.id)
      onClose()
    } catch (err) {
      console.error('Fork failed:', err)
      toast.error('Could not record fork telemetry, but launching workspace.')
      onLaunchFork(effectivePrompt, engine, report?.id)
      onClose()
    } finally {
      setForking(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(124, 106, 240, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(124, 106, 240, 0.15)',
                color: 'var(--violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GitFork size={19} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Fork Research Inquiry
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Branch this study under an alternative methodology lens or target paradigm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Parent Report Context */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>
              Original Study Question
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
              {report?.question}
            </div>
          </div>

          {/* Step 1: Select Target Lens */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              1. Select Command Lens Mutation
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {LENS_OPTIONS.map((lens) => {
                const Icon = lens.icon
                const isSelected = selectedLens === lens.id
                return (
                  <div
                    key={lens.id}
                    onClick={() => {
                      setSelectedLens(lens.id)
                      setCustomPrompt('')
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? `1.5px solid ${lens.color}` : '1px solid var(--border)',
                      backgroundColor: isSelected ? lens.bgColor : 'var(--surface-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        backgroundColor: lens.bgColor,
                        color: lens.color,
                        marginTop: 2,
                      }}
                    >
                      <Icon size={14} strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? lens.color : 'var(--text)' }}>
                        {lens.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.35 }}>
                        {lens.desc}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 2: Prompt Preview & Customization */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                2. Mutated Inquiry Prompt
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Editable before launch
              </span>
            </div>
            <textarea
              rows={3}
              value={customPrompt || suggestedPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={suggestedPrompt}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-muted)',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.45,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Step 3: Engine Preference */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                Research Engine
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {engine === 'crewai' ? 'CrewAI 4-Agent Architecture' : 'LangGraph Fast Reactive StateGraph'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setEngine('langgraph')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: engine === 'langgraph' ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  backgroundColor: engine === 'langgraph' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: engine === 'langgraph' ? 'var(--cyan)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Zap size={11} strokeWidth={2.2} /> LangGraph
              </button>
              <button
                type="button"
                onClick={() => setEngine('crewai')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: engine === 'crewai' ? '1px solid var(--violet)' : '1px solid var(--border)',
                  backgroundColor: engine === 'crewai' ? 'rgba(124, 106, 240, 0.15)' : 'transparent',
                  color: engine === 'crewai' ? 'var(--violet)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Users size={11} strokeWidth={2.2} /> CrewAI
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            backgroundColor: 'var(--surface-card)',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={forking}
            style={{ fontSize: '13px', padding: '8px 16px', borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleLaunch}
            disabled={forking}
            style={{
              fontSize: '13px',
              padding: '8px 18px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              backgroundColor: 'var(--violet)',
              borderColor: 'var(--violet)',
            }}
          >
            <GitFork size={14} strokeWidth={2.2} />
            <span>{forking ? 'Forking...' : 'Launch Fork Inquiry'}</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  )
}
