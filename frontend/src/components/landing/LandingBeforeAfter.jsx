import { useState } from 'react'
import { Check, X, AlertTriangle, ShieldCheck, Sparkles, HelpCircle, ExternalLink } from 'lucide-react'

export function LandingBeforeAfter() {
  const [activeTab, setActiveTab] = useState('assistant') // 'assistant' | 'generic'

  return (
    <section className="landing-section" id="comparison">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <ShieldCheck size={14} /> Adversarial Grounding
          </div>
          <h2 className="landing-section-title">
            The Difference Between Chatbot Hallucinations & Verifiable Science
          </h2>
          <p className="landing-section-subtitle">
            Generic LLMs invent fake papers and broken DOIs. AI Research Assistant queries live academic APIs and audits every single assertion.
          </p>
        </div>

        {/* Before / After Container Card */}
        <div className="before-after-card">
          <div className="comparison-toggle-bar">
            <button
              type="button"
              className={`comparison-toggle-btn${activeTab === 'assistant' ? ' active' : ''}`}
              onClick={() => setActiveTab('assistant')}
            >
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <span>AI Research Assistant (Verified & Grounded)</span>
            </button>

            <button
              type="button"
              className={`comparison-toggle-btn${activeTab === 'generic' ? ' active' : ''}`}
              onClick={() => setActiveTab('generic')}
            >
              <AlertTriangle size={16} style={{ color: '#f43f5e' }} />
              <span>Generic AI Chatbot (ChatGPT / Claude)</span>
            </button>
          </div>

          <div style={{ padding: '28px 32px' }}>
            {activeTab === 'assistant' ? (
              <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      ✓ Fact-Audited
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(124, 106, 240, 0.14)', color: 'var(--violet)', border: '1px solid rgba(124, 106, 240, 0.3)' }}>
                      DOIs Resolved: 10.1038/s41586-024-07123-x
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                    Confidence Score: <strong style={{ color: '#10b981' }}>98.4% (Verified)</strong>
                  </span>
                </div>

                <div style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text)' }}>
                  <p style={{ margin: '0 0 10px' }}>
                    Transient expression of Yamanaka factors (OSKM) induces measurable epigenetic rejuvenation across murine tissue models without activating uncontrolled pluripotency{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '1px 6px', borderRadius: 4, backgroundColor: 'rgba(124,106,240,0.15)', color: 'var(--violet)', fontWeight: 700 }}>
                      [1: Nature Aging 2024]
                    </span>
                    . Specifically, cyclic 2-day-on / 5-day-off doxycycline regimens demonstrated restored retinal axon density and reduced Horvath DNA methylation clock ages by 34.2%{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '1px 6px', borderRadius: 4, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                      [2: PubMed PMID:38491204]
                    </span>
                    .
                  </p>
                </div>

                {/* Grounded Source Proof Box */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>[1] Verified DOI</span>
                    <span style={{ color: 'var(--text)' }}>Nature Aging • Citations: 142 • Author h-index: 54</span>
                  </div>
                  <span style={{ color: 'var(--violet)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>View Crossref Metadata</span>
                    <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            ) : (
              <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'rgba(244, 63, 94, 0.14)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                      ⚠ High Hallucination Risk
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backgroundColor: 'var(--panel-alt)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                      No Real-time DOI Verification
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#f43f5e' }}>
                    Citations: <strong>Unverified / Fabricated</strong>
                  </span>
                </div>

                <div style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-dim)' }}>
                  <p style={{ margin: '0 0 10px' }}>
                    Yamanaka factors are great for anti-aging. In a recent 2023 study by Dr. Smith et al. published in the Journal of Biological Rejuvenation (which does not exist), they found mice lived 80% longer with no cancer (fabricated quantitative metric). You can check the paper at www.nature.com/fake-doi-12345 (404 broken link).
                  </p>
                </div>

                {/* Broken Proof Box */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(244, 63, 94, 0.06)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#f43f5e',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <X size={15} strokeWidth={2.5} />
                    <span>Failed Crossref DOI Resolution — Paper title and volume cannot be confirmed in literature.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
