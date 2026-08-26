import { Zap, Atom, Dna, Rocket } from 'lucide-react'
import { WelcomeHeroIllustration } from './illustrations/EmptyStateIllustrations'

const SUGGESTIONS = [
  {
    icon: <Zap size={18} strokeWidth={2} />,
    colorClass: 'badge-amber',
    title: 'Solid-State Batteries',
    query: 'What are the latest breakthroughs and commercialization milestones for solid-state batteries in 2026?',
  },
  {
    icon: <Atom size={18} strokeWidth={2} />,
    colorClass: 'badge-violet',
    title: 'Quantum Computing',
    query: 'What are the latest breakthroughs in fault-tolerant quantum computing architectures?',
  },
  {
    icon: <Dna size={18} strokeWidth={2} />,
    colorClass: 'badge-emerald',
    title: 'AI in Drug Discovery',
    query: 'How are generative AI models accelerating novel drug discovery and clinical trials?',
  },
  {
    icon: <Rocket size={18} strokeWidth={2} />,
    colorClass: 'badge-cyan',
    title: 'Commercial Fusion Energy',
    query: 'What is the current status and roadmap of private commercial fusion energy ventures?',
  },
]

export default function Placeholder({ onSelectSuggestion }) {
  return (
    <div className="placeholder card">
      <div className="placeholder-hero">
        <WelcomeHeroIllustration />
        <h2 className="placeholder-title">Autonomous Deep Research Assistant</h2>
        <p className="placeholder-desc">
          Powered by LangGraph multi-step planning, real-time web search, iterative self-review, and citation verification.
        </p>
      </div>

      <div className="placeholder-suggestions">
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>
          Or try a sample research topic
        </div>
        <div className="suggestions-grid">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              className="suggestion-card"
              onClick={() => onSelectSuggestion?.(item.query)}
              type="button"
            >
              <div className={`suggestion-icon-badge ${item.colorClass}`}>
                {item.icon}
              </div>
              <div className="suggestion-info">
                <div className="suggestion-title">{item.title}</div>
                <div className="suggestion-query">{item.query}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
