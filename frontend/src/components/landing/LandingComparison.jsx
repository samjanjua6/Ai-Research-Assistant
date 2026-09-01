import { Check, X, ShieldCheck, Scale } from 'lucide-react'

const COMPARISON_ROWS = [
  {
    feature: 'Direct Academic Database APIs (arXiv, PubMed, Crossref)',
    google: 'Manual Search Only',
    chatgpt: '❌ High Hallucination',
    perplexity: 'Partial (Web Scrape)',
    assistant: '✅ Native Real-time Integration',
    highlight: true,
  },
  {
    feature: 'Adversarial Fact-Checking & Citation Audit',
    google: '❌ None',
    chatgpt: '❌ None',
    perplexity: '❌ None',
    assistant: '✅ Built-in Confidence Scorer',
    highlight: true,
  },
  {
    feature: 'Grounded Document Passports (PDF / DOCX Upload)',
    google: '❌ None',
    chatgpt: 'File Upload (No Passports)',
    perplexity: 'File Upload Only',
    assistant: '✅ Vector Grounding + Passport Preview',
    highlight: false,
  },
  {
    feature: 'Interactive Section Expander & Counter-Arguments',
    google: '❌ None',
    chatgpt: '❌ None',
    perplexity: '❌ None',
    assistant: '✅ One-Click Elaboration & Tables',
    highlight: true,
  },
  {
    feature: 'Interactive "Chat with Report" (Grounded Evidence Q&A)',
    google: '❌ None',
    chatgpt: 'Generic Memory Chat',
    perplexity: 'Thread Follow-up',
    assistant: '✅ Evidence Cross-Examination Drawer',
    highlight: false,
  },
  {
    feature: '1-Click BibTeX Export for LaTeX / Overleaf',
    google: '❌ None',
    chatgpt: '❌ None',
    perplexity: '❌ None',
    assistant: '✅ Instant BibTeX Formatting',
    highlight: false,
  },
  {
    feature: 'Custom Research Lenses (/DEEP, /CHALLENGE, /ANGLE)',
    google: '❌ None',
    chatgpt: '❌ None',
    perplexity: '❌ None',
    assistant: '✅ 6 Methodological Modes',
    highlight: false,
  },
]

export function LandingComparison() {
  return (
    <section className="landing-section" id="comparison">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <Scale size={14} /> Competitive Matrix
          </div>
          <h2 className="landing-section-title">
            How AI Research Assistant Compares
          </h2>
          <p className="landing-section-subtitle">
            See why leading scientists, analysts, and strategists rely on autonomous multi-agent research over standard search engines and generic chatbots.
          </p>
        </div>

        {/* Responsive Table */}
        <div className="landing-table-container">
          <table className="landing-matrix-table">
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Capability / Feature</th>
                <th style={{ minWidth: 140 }}>Google / Bing</th>
                <th style={{ minWidth: 150 }}>ChatGPT Plus</th>
                <th style={{ minWidth: 150 }}>Perplexity Pro</th>
                <th style={{ minWidth: 220, backgroundColor: 'var(--violet-soft)', color: 'var(--violet)' }}>
                  ✨ AI Research Assistant
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} style={{ backgroundColor: row.highlight ? 'rgba(124, 106, 240, 0.03)' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{row.feature}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{row.google}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{row.chatgpt}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{row.perplexity}</td>
                  <td style={{ color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(124, 106, 240, 0.06)' }}>
                    {row.assistant}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
