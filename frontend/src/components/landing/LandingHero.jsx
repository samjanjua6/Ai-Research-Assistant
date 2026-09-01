import { useState, useEffect } from 'react'
import {
  Sparkles,
  ArrowRight,
  Zap,
  ShieldCheck,
  Search,
  CheckCircle2,
  FileText,
  Bot,
  Database,
} from 'lucide-react'

const SAMPLE_PROMPTS = [
  {
    id: 'perovskite',
    label: '⚛️ Perovskite Solar Cells',
    query: '/CHALLENGE "2D/3D Perovskite heterojunction passivation achieving certified >=34% efficiency with moisture stability"',
    papers: 14,
    confidence: 'High',
  },
  {
    id: 'oskm',
    label: '🧬 Yamanaka Reprogramming',
    query: '/DEEP "Yamanaka factors (OSKM) partial epigenetic reprogramming reversing senescence without oncogenesis"',
    papers: 18,
    confidence: 'High',
  },
  {
    id: 'battery',
    label: '⚡ Solid-State Electrolytes',
    query: '/ANGLE "Sulfide vs Oxide vs Polymer solid-state lithium battery electrolytes ion conductivity trade-offs"',
    papers: 12,
    confidence: 'Medium-High',
  },
  {
    id: 'ai-reasoning',
    label: '🧠 o3 vs DeepSeek-R1',
    query: '/TREND "OpenAI o3 & DeepSeek-R1 test-time compute scaling and reinforcement learning benchmarks"',
    papers: 21,
    confidence: 'High',
  },
]

export function LandingHero({ onSelectPrompt, onOpenWorkspace }) {
  const [selectedChip, setSelectedChip] = useState(SAMPLE_PROMPTS[0])
  const [customInput, setCustomInput] = useState(SAMPLE_PROMPTS[0].query)
  const [simulating, setSimulating] = useState(false)
  const [simStep, setSimStep] = useState(0)

  const handleChipClick = (chip) => {
    setSelectedChip(chip)
    setCustomInput(chip.query)
    triggerSimulation()
  }

  const triggerSimulation = () => {
    setSimulating(true)
    setSimStep(1)
    setTimeout(() => setSimStep(2), 700)
    setTimeout(() => setSimStep(3), 1500)
    setTimeout(() => setSimStep(4), 2200)
  }

  useEffect(() => {
    triggerSimulation()
  }, [])

  return (
    <section className="landing-hero">
      <div className="landing-container">
        {/* Top Innovation Pill */}
        <div className="landing-hero-badge">
          <Sparkles size={14} className="icon-pulse" />
          <span>v2.4 Autonomous Academic Engine • 200M+ DOIs • arXiv, PubMed, Semantic Scholar</span>
        </div>

        {/* Primary Headline */}
        <h1 className="landing-hero-title">
          Beyond LLM Hallucinations.<br />
          <span>Autonomous, Peer-Reviewed Research</span><br />
          at Enterprise Depth.
        </h1>

        {/* Sub-headline */}
        <p className="landing-hero-subtitle">
          Deploy 4 collaborative AI agents to search 200M+ academic DOIs and live web sources, fact-check claims against real literature, and generate publication-ready executive synthesis in seconds.
        </p>

        {/* Interactive Query Sandbox */}
        <div className="hero-sandbox-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Interactive Inquiry Sandbox (Live Preview)
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <CheckCircle2 size={12} /> 4 Agents Standby
            </span>
          </div>

          {/* Prompt Chips */}
          <div className="sandbox-chips">
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`sandbox-chip${selectedChip?.id === p.id ? ' active' : ''}`}
                onClick={() => handleChipClick(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (customInput.trim()) {
                onSelectPrompt(customInput.trim())
              }
            }}
            className="sandbox-input-row"
          >
            <input
              type="text"
              className="sandbox-input"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Ask any complex scientific, market, or technological inquiry…"
            />
            <button type="submit" className="sandbox-btn">
              <span>Run Live Investigation</span>
              <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          </form>

          {/* Simulated 4-Agent Pipeline Progression */}
          <div className="sandbox-pipeline-preview">
            <div className="sandbox-step-row" style={{ opacity: simStep >= 1 ? 1 : 0.35, transition: 'opacity 0.25s ease' }}>
              <div className="sandbox-step-icon" style={{ backgroundColor: 'rgba(124, 106, 240, 0.15)', color: 'var(--violet)' }}>
                <Bot size={13} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Methodologist Planner
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '11.5px' }}>
                  Decomposed query into 4 boolean search vectors
                </span>
              </div>
            </div>

            <div className="sandbox-step-row" style={{ opacity: simStep >= 2 ? 1 : 0.35, transition: 'opacity 0.25s ease' }}>
              <div className="sandbox-step-icon" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                <Database size={13} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Academic & Live Web Investigator
                </span>
                <span style={{ color: '#06b6d4', fontSize: '11.5px', fontWeight: 600 }}>
                  Scanned arXiv, PubMed & Crossref • {selectedChip.papers} Verified DOIs
                </span>
              </div>
            </div>

            <div className="sandbox-step-row" style={{ opacity: simStep >= 3 ? 1 : 0.35, transition: 'opacity 0.25s ease' }}>
              <div className="sandbox-step-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <ShieldCheck size={13} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Fact-Checking & Review Auditor
                </span>
                <span style={{ color: '#10b981', fontSize: '11.5px', fontWeight: 600 }}>
                  [Confidence: {selectedChip.confidence}] • 0 Hallucinations Detected
                </span>
              </div>
            </div>

            <div className="sandbox-step-row" style={{ opacity: simStep >= 4 ? 1 : 0.35, transition: 'opacity 0.25s ease' }}>
              <div className="sandbox-step-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <FileText size={13} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Evidence Synthesizer
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPrompt(customInput)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--violet)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Open Full Synthesis Report</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Ribbons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            flexWrap: 'wrap',
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              200M+
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>
              Academic Papers & DOIs
            </div>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: 'var(--border)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-display)' }}>
              100%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>
              Source-Grounded Citations
            </div>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: 'var(--border)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-display)' }}>
              4 Agents
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>
              Adversarial Fact-Check Pipeline
            </div>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: 'var(--border)' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--violet)', fontFamily: 'var(--font-display)' }}>
              &lt; 45s
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>
              End-to-End Synthesis Time
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
