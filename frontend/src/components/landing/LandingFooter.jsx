import { Sparkles, ArrowRight, Code2, ExternalLink, ShieldCheck, Heart } from 'lucide-react'
import { LogoMark } from '../brand/Logo'

export function LandingFooter({ onOpenWorkspace, onOpenAuth }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="landing-footer">
      <div className="landing-container">
        {/* High-Impact CTA Banner */}
        <div className="landing-cta-banner">
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              Start Your First Deep Investigation in Seconds
            </h2>
            <p style={{ fontSize: '14.5px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 24 }}>
              Join researchers, scientists, and strategists leveraging autonomous multi-agent intelligence with verifiable citations. Free and open to everyone.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenWorkspace}
                style={{
                  fontSize: '14px',
                  padding: '12px 28px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                  boxShadow: '0 6px 20px rgba(124, 106, 240, 0.45)',
                }}
              >
                <span>Launch Interactive Workspace</span>
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation Grid */}
        <div className="landing-footer-grid">
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <LogoMark size={24} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
                Research <span style={{ color: 'var(--violet)' }}>Assistant</span>
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 320, marginBottom: 16 }}>
              Autonomous multi-agent research engine querying 200M+ academic DOIs and live web intelligence with zero hallucinations.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', color: 'var(--text-dim)' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>All Systems Operational • FastAPI & LangGraph</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a className="landing-nav-link" onClick={() => scrollTo('capabilities')}>Capabilities</a>
              <a className="landing-nav-link" onClick={() => scrollTo('comparison')}>Comparison Matrix</a>
              <a className="landing-nav-link" onClick={() => scrollTo('academic-engine')}>Academic Repositories</a>
              <a className="landing-nav-link" onClick={() => scrollTo('use-cases')}>Use Cases</a>
              <a className="landing-nav-link" onClick={onOpenWorkspace}>Open Workspace</a>
            </div>
          </div>

          {/* Resources Links */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Integrations
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>arXiv API</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>PubMed / PMC</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>Semantic Scholar</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>Crossref DOIs</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>DuckDuckGo Live Web</span>
            </div>
          </div>

          {/* Legal & Open Source */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Open Source
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="https://github.com/samjanjua6/Ai-Research-Assistant"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Code2 size={13} style={{ color: 'var(--violet)' }} />
                <span>GitHub Repository</span>
              </a>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>Apache 2.0 License</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12.5px' }}>Privacy & Security Policy</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)', flexWrap: 'wrap', gap: 10 }}>
          <span>© {new Date().getFullYear()} AI Research Assistant. All rights reserved.</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Crafted with <Heart size={12} style={{ color: '#f43f5e' }} /> for autonomous scientific discovery.
          </span>
        </div>
      </div>
    </footer>
  )
}
