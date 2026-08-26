import { WelcomeHeroIllustration } from './illustrations/EmptyStateIllustrations'

const SUGGESTIONS = [
  {
    icon: '⚡',
    title: 'Solid-State Batteries',
    query: 'What are the latest breakthroughs and commercialization milestones for solid-state batteries in 2026?',
  },
  {
    icon: '🔬',
    title: 'Quantum Computing',
    query: 'What are the latest breakthroughs in fault-tolerant quantum computing architectures?',
  },
  {
    icon: '🧬',
    title: 'AI in Drug Discovery',
    query: 'How are generative AI models accelerating novel drug discovery and clinical trials?',
  },
  {
    icon: '🚀',
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
              <div className="suggestion-icon">{item.icon}</div>
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
