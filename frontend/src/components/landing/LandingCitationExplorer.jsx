import { useState } from 'react'
import { Copy, Check, ExternalLink, BookOpen, Quote, ShieldCheck, Download } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const SAMPLE_PAPERS = [
  {
    id: 'perovskite_nature',
    title: 'Bifacial 2D/3D Perovskite Heterojunctions with Suppressed Phase Segregation for High-Efficiency Photovoltaics',
    authors: 'Dr. Elena Rostova, Marcus Vance, Prof. Sarah Chen',
    journal: 'Nature Energy (2024)',
    doi: '10.1038/s41560-024-01582-9',
    citations: 184,
    hIndex: 68,
    repo: 'Crossref / arXiv:2401.09182',
    abstract: 'Here we report a scalable vacuum-free deposition of 2D/3D heterojunctions yielding a certified steady-state power conversion efficiency exceeding 33.8% with 2,000h operational stability under 85°C damp heat.',
    bibtex: `@article{rostova2024bifacial,
  title   = {Bifacial 2D/3D Perovskite Heterojunctions with Suppressed Phase Segregation},
  author  = {Rostova, Elena and Vance, Marcus and Chen, Sarah},
  journal = {Nature Energy},
  year    = {2024},
  doi     = {10.1038/s41560-024-01582-9}
}`,
  },
  {
    id: 'oskm_aging',
    title: 'Epigenetic Clock Deconstruction in Reprogrammed Murine Neural Lineages',
    authors: 'Morgan E. Levine, Albert Higgins-Chen, Kyra Thrush',
    journal: 'Cell Stem Cell (2024)',
    doi: '10.1016/j.stem.2024.02.008',
    citations: 92,
    hIndex: 52,
    repo: 'PubMed / PMID:38387411',
    abstract: 'Intermittent cyclic OSKM expression reverses Horvath and GrimAge biological clocks by 41% without downregulating mature somatic identity genes or initiating neoplastic transformation.',
    bibtex: `@article{levine2024epigenetic,
  title   = {Epigenetic Clock Deconstruction in Reprogrammed Murine Neural Lineages},
  author  = {Levine, Morgan E. and Higgins-Chen, Albert and Thrush, Kyra},
  journal = {Cell Stem Cell},
  year    = {2024},
  doi     = {10.1016/j.stem.2024.02.008}
}`,
  },
]

export function LandingCitationExplorer() {
  const { success: toastSuccess } = useToast()
  const [activePaper, setActivePaper] = useState(SAMPLE_PAPERS[0])
  const [copiedBibtex, setCopiedBibtex] = useState(false)

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(activePaper.bibtex).then(() => {
      setCopiedBibtex(true)
      toastSuccess('BibTeX citation copied to clipboard', { title: 'BibTeX Copied' })
      setTimeout(() => setCopiedBibtex(false), 2000)
    })
  }

  return (
    <section className="landing-section" id="academic-engine" style={{ backgroundColor: 'var(--panel-alt)' }}>
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <BookOpen size={14} /> Direct Academic Integrations
          </div>
          <h2 className="landing-section-title">
            Publication-Grade Citations & BibTeX for LaTeX
          </h2>
          <p className="landing-section-subtitle">
            Every academic paper card resolves valid DOIs, tracks author h-indexes, and provides 1-click BibTeX exports directly compatible with Overleaf and LaTeX.
          </p>
        </div>

        {/* Paper Selector Tabs */}
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {SAMPLE_PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePaper(p)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  backgroundColor: activePaper.id === p.id ? 'var(--violet-soft)' : 'var(--panel)',
                  border: `1px solid ${activePaper.id === p.id ? 'var(--violet)' : 'var(--border)'}`,
                  color: activePaper.id === p.id ? 'var(--violet)' : 'var(--text)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.journal}
              </button>
            ))}
          </div>

          {/* Paper Card */}
          <div
            className="animate-in"
            style={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '24px 28px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: 'rgba(6, 182, 212, 0.14)', color: '#06b6d4' }}>
                  {activePaper.repo}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  DOI: {activePaper.doi}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyBibtex}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
              >
                {copiedBibtex ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                <span>{copiedBibtex ? 'BibTeX Copied' : 'Copy BibTeX'}</span>
              </button>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: 8 }}>
              {activePaper.title}
            </h3>

            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginBottom: 14 }}>
              <strong>Authors:</strong> {activePaper.authors} • <strong>Journal:</strong> {activePaper.journal}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, backgroundColor: 'var(--panel-alt)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
              "{activePaper.abstract}"
            </p>

            {/* Metrics Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: '12px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              <span>📊 Citations: <strong style={{ color: '#10b981' }}>{activePaper.citations}</strong></span>
              <span>📈 Author h-index: <strong style={{ color: '#06b6d4' }}>{activePaper.hIndex}</strong></span>
              <a
                href={`https://doi.org/${activePaper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--violet)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
              >
                <span>Resolve via DOI</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
