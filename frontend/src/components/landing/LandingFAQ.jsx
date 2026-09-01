import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'How does AI Research Assistant prevent AI hallucinations?',
    a: 'Unlike generic chatbots that generate text from ungrounded parametric memory, our platform deploys an adversarial Fact-Checking & Review Auditor. Every claim must trace back to an excerpt from a verified academic DOI (arXiv, PubMed, Semantic Scholar) or indexed live web page. Unverified statements are explicitly flagged with confidence ratings ([Confidence: High/Medium/Low]).',
  },
  {
    q: 'Which academic databases are searched directly?',
    a: 'We query the arXiv API for physics, computer science, and AI preprints; PubMed/PMC E-utilities for biomedical literature and clinical trials; Semantic Scholar for citation velocity and author h-index graphs; and Crossref for instant DOI resolution and metadata verification.',
  },
  {
    q: 'Is my uploaded document data used for AI training?',
    a: 'No, absolutely not. We enforce a strict zero-retention and zero-training policy on all uploaded PDF, DOCX, TXT, and MD files. Documents are parsed into ephemeral local vector passports solely to ground your current research session and are never retained for model retraining.',
  },
  {
    q: 'Can I export reports for publication, LaTeX, or presentations?',
    a: 'Yes. Reports can be exported as publication-ready PDFs with clean table pagination, downloaded as raw Markdown (.md) for note-taking apps like Obsidian and Notion, copied as formatted BibTeX for Overleaf / LaTeX, or shared via instant public links (/r/{share_token}).',
  },
  {
    q: 'How does the multi-agent CrewAI & LangGraph engine collaborate?',
    a: 'Our architecture breaks research down into specialized agent nodes: the Methodologist Planner decomposes complex inquiries into boolean queries; the Investigator agent runs parallel searches across academic APIs; the Evidence Synthesizer drafts structured matrices; and the Fact Auditor performs adversarial cross-checks.',
  },
]

export function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState(0)

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <section className="landing-section" id="faq">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="landing-eyebrow">
            <HelpCircle size={14} /> Frequently Asked Questions
          </div>
          <h2 className="landing-section-title">
            Everything You Need to Know
          </h2>
          <p className="landing-section-subtitle">
            Transparent answers regarding our grounding methodology, data privacy, and academic integrations.
          </p>
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx
            return (
              <div key={idx} className={`faq-item${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: isOpen ? 'var(--violet)' : 'var(--text-dim)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="faq-answer animate-in">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
