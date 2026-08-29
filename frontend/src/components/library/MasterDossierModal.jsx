import { useState } from 'react'
import { X, Sparkles, Layers, BookOpen, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { generateMasterDossier, exportBibTeX, exportCSV } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export function MasterDossierModal({ selectedRuns, onClose, onDossierCreated }) {
  const { info: toastInfo, error: toastError } = useToast()
  const [title, setTitle] = useState(() => {
    if (!selectedRuns || selectedRuns.length === 0) return ''
    return `Cross-Study Master Dossier (${selectedRuns.length} Investigations)`
  })
  const [focus, setFocus] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedDossier, setCompletedDossier] = useState(null)

  const handleSynthesize = async (e) => {
    e.preventDefault()
    if (!selectedRuns || selectedRuns.length < 2) {
      toastError('Select at least 2 research reports to synthesize a dossier.')
      return
    }

    setLoading(true)
    try {
      const res = await generateMasterDossier({
        run_ids: selectedRuns.map((r) => r.id),
        title,
        focus,
      })
      if (res?.dossier) {
        setCompletedDossier(res.dossier)
        toastInfo('Master Dossier synthesized and saved to your library!', { title: 'Dossier Ready' })
        onDossierCreated?.(res.dossier)
      }
    } catch (err) {
      console.error('Failed to generate dossier:', err)
      toastError(err.message || 'Dossier cross-synthesis failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBibTeX = async () => {
    try {
      const bib = await exportBibTeX(selectedRuns.map((r) => r.id))
      const blob = new Blob([bib], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dossier_citations_${new Date().toISOString().split('T')[0]}.bib`
      a.click()
      URL.revokeObjectURL(url)
      toastInfo('BibTeX (.bib) bibliography downloaded.', { title: 'BibTeX Ready' })
    } catch (err) {
      toastError('Failed to export BibTeX.')
    }
  }

  const handleDownloadCSV = async () => {
    try {
      const csv = await exportCSV(selectedRuns.map((r) => r.id))
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `literature_matrix_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastInfo('CSV literature matrix downloaded.', { title: 'CSV Ready' })
    } catch (err) {
      toastError('Failed to export CSV.')
    }
  }

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
          width: '100%',
          maxWidth: 680,
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
            padding: '18px 24px',
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
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(124, 106, 240, 0.15)',
                color: 'var(--violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Master Dossier Cross-Synthesis
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                Unite {selectedRuns?.length || 0} studies into an overarching executive meta-briefing.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 10px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {completedDossier ? (
            <div className="animate-in" style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={28} strokeWidth={2.2} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
                Master Dossier Successfully Generated!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.5 }}>
                {completedDossier.summary}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadBibTeX}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px' }}
                >
                  <Download size={13} strokeWidth={2} /> Export BibTeX (.bib)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadCSV}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px' }}
                >
                  <Download size={13} strokeWidth={2} /> Export CSV Matrix
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{ fontSize: '12.5px' }}
                >
                  View in Library
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSynthesize} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Selected Studies List */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Selected Research Studies ({selectedRuns?.length || 0})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedRuns.map((r, idx) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: '12.5px',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{idx + 1}. {r.question}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>
                        {r.sources_count || 0} sources
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dossier Title */}
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Dossier Title
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Synthesis: Solid-State vs Sodium-Ion Batteries"
                  required
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13.5px' }}
                />
              </div>

              {/* Specific Focus */}
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Strategic Angle / Specific Focus (Optional)
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Focus on commercial manufacturing costs and 2026-2028 timeline"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13.5px' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                      Synthesizing Meta-Dossier...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} strokeWidth={2.2} />
                      Generate Master Synthesis
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
