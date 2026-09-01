import { Database, FileText, Bot, Sparkles, ShieldCheck, ArrowRight, Layers, MessageSquare } from 'lucide-react'

export function LandingBentoGrid({ onOpenWorkspace }) {
  return (
    <section className="landing-section" id="capabilities">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <Layers size={14} /> Four Core Pillars
          </div>
          <h2 className="landing-section-title">
            Engineered for Grounded Scientific & Strategic Depth
          </h2>
          <p className="landing-section-subtitle">
            Every layer of the platform is designed to cross-examine evidence, eliminate hallucinations, and deliver synthesis you can stand behind.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Bento Card 1: Direct Academic Integrations */}
          <div className="bento-card bento-card-8">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(6, 182, 212, 0.14)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={18} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                  Native Repositories
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Direct Academic API Integrations
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: 1.55, maxWidth: 580, marginBottom: 20 }}>
                Query dedicated academic databases alongside the live web. Automatically pulls valid DOIs, author citation velocity, journal quartile impact rankings, and full-text preprint PDFs.
              </p>
            </div>

            {/* Academic Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <span style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                📚 arXiv (Preprints & Categories)
              </span>
              <span style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                🧬 PubMed / PMC (Clinical Trials)
              </span>
              <span style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                🔍 Semantic Scholar (Citation Graph)
              </span>
              <span style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                🏷️ Crossref (DOI Verification)
              </span>
            </div>
          </div>

          {/* Bento Card 2: Grounded Document Passports */}
          <div className="bento-card bento-card-4">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(124, 106, 240, 0.14)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid rgba(124, 106, 240, 0.3)' }}>
                  Grounded Passports
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Document Passports
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                Upload PDF, DOCX, TXT research papers for instant local vector context without public data leakage.
              </p>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)', fontSize: '11.5px', color: 'var(--text-dim)' }}>
              🔒 Zero Training on User Uploads • Ephemeral Memory
            </div>
          </div>

          {/* Bento Card 3: 4-Agent Autonomous Collaboration */}
          <div className="bento-card bento-card-6">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  LangGraph & CrewAI
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                4-Agent Collaborative Architecture
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                Methodologist Planner breaks down hypotheses, Evidence Investigator queries 20+ sources, Synthesizer drafts structured matrices, and Fact Auditor performs adversarial verification.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--panel-alt)' }}>Planner</span> →
              <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--panel-alt)' }}>Investigator</span> →
              <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--panel-alt)' }}>Synthesizer</span> →
              <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: 'var(--panel-alt)', color: '#10b981', fontWeight: 600 }}>Auditor</span>
            </div>
          </div>

          {/* Bento Card 4: Interactive Popovers & Chat */}
          <div className="bento-card bento-card-6">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  Interactive RAG
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Chat with Report & Selection Intelligence
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                Highlight text passages to instantly extract quantitative metrics, verify supporting citations, or launch multi-turn grounded conversations over gathered evidence.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '11px', color: 'var(--violet)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} /> One-Click Section Expansions & Counter-Arguments
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
