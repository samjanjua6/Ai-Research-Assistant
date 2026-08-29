import { useState } from 'react'
import { X, Scale, ExternalLink, ShieldCheck, Sparkles, BookOpen, Layers } from 'lucide-react'
import { marked } from 'marked'

export function ComparativeReadingModal({ runA, runB, onClose, onOpenRun }) {
  const [syncScroll, setSyncScroll] = useState(true)

  if (!runA || !runB) return null

  return (
    <div
      className="modal-overlay animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '95vw',
          maxWidth: 1300,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(124, 106, 240, 0.15)',
                color: 'var(--violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Split-Screen Comparative Reading
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                Side-by-side contrast of hypotheses, methodologies, and evidence grounding.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
              />
              Sync Scroll
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '6px 10px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dual Column Container */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Column A */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              padding: '20px 24px',
            }}
          >
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: runA.engine === 'crewai' ? 'rgba(124, 106, 240, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                  color: runA.engine === 'crewai' ? 'var(--violet)' : '#06b6d4',
                  textTransform: 'uppercase',
                }}
              >
                Study A • {runA.engine || 'LangGraph'}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '8px 0 6px' }}>
                {runA.question}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '12px', color: 'var(--text-dim)' }}>
                <span>{runA.sources_count || 0} citations</span>
                <span>•</span>
                <span>{new Date(runA.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div
              className="report-markdown"
              style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text)' }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(runA.final_report || runA.summary || '_No report text available._'),
              }}
            />
          </div>

          {/* Column B */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '20px 24px',
              backgroundColor: 'var(--panel-alt)',
            }}
          >
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: runB.engine === 'crewai' ? 'rgba(124, 106, 240, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                  color: runB.engine === 'crewai' ? 'var(--violet)' : '#06b6d4',
                  textTransform: 'uppercase',
                }}
              >
                Study B • {runB.engine || 'LangGraph'}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '8px 0 6px' }}>
                {runB.question}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '12px', color: 'var(--text-dim)' }}>
                <span>{runB.sources_count || 0} citations</span>
                <span>•</span>
                <span>{new Date(runB.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div
              className="report-markdown"
              style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text)' }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(runB.final_report || runB.summary || '_No report text available._'),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
