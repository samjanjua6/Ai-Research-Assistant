import { GraduationCap, Microscope, TrendingUp, LineChart, ArrowRight } from 'lucide-react'

const USE_CASES = [
  {
    icon: <GraduationCap size={22} style={{ color: '#06b6d4' }} />,
    title: 'Academic & PhD Researchers',
    desc: 'Accelerate comprehensive literature reviews from weeks to minutes. Cross-reference arXiv preprints, pull BibTeX citations, and uncover hidden gaps.',
    tag: 'Literature Reviews',
  },
  {
    icon: <Microscope size={22} style={{ color: '#10b981' }} />,
    title: 'Biotech & Clinical Scientists',
    desc: 'Scan PubMed clinical trial endpoints, verify dosage protocols, and fact-check mechanistic biological hypotheses against peer-reviewed journals.',
    tag: 'Clinical Intelligence',
  },
  {
    icon: <TrendingUp size={22} style={{ color: 'var(--violet)' }} />,
    title: 'Product & Tech Strategists',
    desc: 'Perform competitive benchmarks, evaluate emerging patent landscape trends, and synthesize engineering trade-offs with structured comparison matrices.',
    tag: 'Market & Tech Diligence',
  },
  {
    icon: <LineChart size={22} style={{ color: '#f59e0b' }} />,
    title: 'Investment & Due Diligence Analysts',
    desc: 'Audit commercialization roadmaps, cross-examine technical claims against primary literature, and identify hidden execution risks in pitch decks.',
    tag: 'Venture & Risk Audit',
  },
]

export function LandingUseCases({ onOpenWorkspace }) {
  return (
    <section className="landing-section" id="use-cases">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <GraduationCap size={14} /> Tailored Workflows
          </div>
          <h2 className="landing-section-title">
            Built for Rigorous Inquiries Across Disciplines
          </h2>
          <p className="landing-section-subtitle">
            Whether preparing a grant proposal, conducting due diligence, or exploring frontiers in deep tech, our agents deliver precision.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {USE_CASES.map((uc, idx) => (
            <div
              key={idx}
              className="bento-card"
              style={{ padding: '24px', cursor: 'pointer' }}
              onClick={onOpenWorkspace}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {uc.icon}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: 'var(--panel-alt)', color: 'var(--text-dim)' }}>
                    {uc.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  {uc.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.55 }}>
                  {uc.desc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, fontSize: '12px', fontWeight: 600, color: 'var(--violet)' }}>
                <span>Try Template in Workspace</span>
                <ArrowRight size={13} strokeWidth={2.2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
