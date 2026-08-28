import { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Atom,
  Dna,
  Rocket,
  Cpu,
  Bot,
  Users,
  Microscope,
  Activity,
  BatteryCharging,
  Flame,
  Sun,
  Layers,
  Compass,
  ShieldCheck,
  Radio,
  Sparkles,
  RefreshCw,
  Globe,
  TrendingUp,
  Flame as FireIcon,
  HelpCircle,
} from 'lucide-react'
import { WelcomeHeroIllustration } from './illustrations/EmptyStateIllustrations'
import { fetchTrendingTopics, fetchWildcardPrompt } from '../api/client'
import { toast } from '../context/ToastContext'

const CATEGORIES = [
  { id: 'all', label: 'All Frontiers', icon: Globe },
  { id: 'ai', label: 'AI & Agents', icon: Cpu },
  { id: 'biotech', label: 'Biotech & Medicine', icon: Dna },
  { id: 'energy', label: 'Energy & Materials', icon: BatteryCharging },
  { id: 'quantum', label: 'Quantum & Physics', icon: Atom },
]

// Instant offline/fallback pool of 8 topics
const FALLBACK_TOPICS = [
  {
    id: 'fb-1',
    category: 'ai',
    category_label: 'AI & Autonomous Systems',
    lens: '/ANGLE',
    velocity_badge: 'Breaking Benchmark',
    title: 'Reasoning Models vs Test-Time Compute Scaling',
    query: '/ANGLE "OpenAI o3 & DeepSeek-R1 test-time compute scaling" vs "Traditional Pre-Training compute allocation"',
    why_trending: 'Inference compute scaling is yielding greater reasoning gains than pre-training parameter growth.',
    source: 'arXiv:2501.12948',
    icon: 'Cpu',
    color_class: 'badge-violet',
  },
  {
    id: 'fb-2',
    category: 'biotech',
    category_label: 'Biotech & Medicine',
    lens: '/DEEP',
    velocity_badge: 'Clinical Milestone',
    title: 'In Vivo mRNA Reprogramming for Cancer Immunotherapy',
    query: '/DEEP "Targeted Lipid Nanoparticles (tLNPs) delivering mRNA for in vivo CAR-T cell generation"',
    why_trending: 'Direct in-body generation of CAR-T cells without ex vivo cell harvesting.',
    source: 'Nature Medicine',
    icon: 'Dna',
    color_class: 'badge-emerald',
  },
  {
    id: 'fb-3',
    category: 'energy',
    category_label: 'Energy & Materials',
    lens: '/ANGLE',
    velocity_badge: 'Commercial Deployment',
    title: 'Solid-State vs Sodium-Ion Battery Commercialization',
    query: '/ANGLE "Sulfide-based Solid-State Electrolytes" vs "Prismatic Sodium-Ion" in EV range and cost parity',
    why_trending: 'Automakers have announced first-generation manufacturing lines with conflicting energy densities.',
    source: 'Joule & Battery Materials',
    icon: 'BatteryCharging',
    color_class: 'badge-amber',
  },
  {
    id: 'fb-4',
    category: 'quantum',
    category_label: 'Quantum & Deep Tech',
    lens: '/HYP',
    velocity_badge: 'Quantum Supremacy',
    title: 'Neutral Atom Qubits & Fault-Tolerant Logical Gates',
    query: '/HYP "Rydberg neutral atom optical tweezers achieve 100+ physical-to-logical qubit error threshold in transversal gates"',
    why_trending: 'Demonstrations of hundreds of coherent logical qubits using laser optical tweezer arrays.',
    source: 'Nature Physics',
    icon: 'Atom',
    color_class: 'badge-cyan',
  },
]

function renderTopicIcon(iconName) {
  switch (iconName) {
    case 'Cpu':
      return <Cpu size={18} strokeWidth={2} />
    case 'Bot':
      return <Bot size={18} strokeWidth={2} />
    case 'Zap':
      return <Zap size={18} strokeWidth={2} />
    case 'Users':
      return <Users size={18} strokeWidth={2} />
    case 'Dna':
      return <Dna size={18} strokeWidth={2} />
    case 'Microscope':
      return <Microscope size={18} strokeWidth={2} />
    case 'Activity':
      return <Activity size={18} strokeWidth={2} />
    case 'BatteryCharging':
      return <BatteryCharging size={18} strokeWidth={2} />
    case 'Flame':
      return <Flame size={18} strokeWidth={2} />
    case 'Sun':
      return <Sun size={18} strokeWidth={2} />
    case 'Atom':
      return <Atom size={18} strokeWidth={2} />
    case 'Layers':
      return <Layers size={18} strokeWidth={2} />
    case 'Compass':
      return <Compass size={18} strokeWidth={2} />
    case 'ShieldCheck':
      return <ShieldCheck size={18} strokeWidth={2} />
    case 'Radio':
      return <Radio size={18} strokeWidth={2} />
    case 'Rocket':
      return <Rocket size={18} strokeWidth={2} />
    default:
      return <Sparkles size={18} strokeWidth={2} />
  }
}

export default function Placeholder({ onSelectSuggestion }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [topics, setTopics] = useState(FALLBACK_TOPICS)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [isShuffling, setIsShuffling] = useState(false)

  const loadTopics = useCallback(async (cat, off = 0, forceRefresh = false) => {
    setLoading(true)
    try {
      const data = await fetchTrendingTopics({
        category: cat === 'all' ? '' : cat,
        offset: off,
        count: 4,
        refresh: forceRefresh,
      })
      if (data?.topics && data.topics.length > 0) {
        setTopics(data.topics)
      }
    } catch (err) {
      console.warn('Failed to fetch trending topics, using local fallback:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTopics(selectedCategory, 0)
  }, [selectedCategory, loadTopics])

  const handleShuffle = async () => {
    setIsShuffling(true)
    const nextOffset = offset + 4
    setOffset(nextOffset)
    await loadTopics(selectedCategory, nextOffset)
    setTimeout(() => setIsShuffling(false), 400)
  }

  const handleSurpriseMe = async () => {
    try {
      const data = await fetchWildcardPrompt()
      if (data?.wildcard) {
        toast.info(`Wildcard selected: ${data.wildcard.title}`)
        onSelectSuggestion?.(data.wildcard.query)
      }
    } catch (err) {
      const randomFallback = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)]
      onSelectSuggestion?.(randomFallback.query)
    }
  }

  return (
    <div className="placeholder card animate-in">
      <div className="placeholder-hero">
        <WelcomeHeroIllustration />
        <h2 className="placeholder-title">Autonomous Deep Research Assistant</h2>
        <p className="placeholder-desc">
          Powered by LangGraph multi-step planning, real-time web search, iterative self-review, and citation verification.
        </p>
      </div>

      <div className="placeholder-suggestions">
        {/* Header with Live Feed Indicator & Action Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-pulse-dot" style={{ backgroundColor: '#10b981' }} />
            <span
              className="eyebrow"
              style={{
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: 'var(--text)',
                textTransform: 'uppercase',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <TrendingUp size={12} strokeWidth={2.4} style={{ color: '#10b981' }} /> Live Frontier Research Trends
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="copy-btn"
              onClick={handleSurpriseMe}
              title="Generate a novel cross-disciplinary hypothesis prompt"
              style={{
                fontSize: '11.5px',
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(124, 106, 240, 0.12)',
                color: 'var(--violet)',
                border: '1px solid rgba(124, 106, 240, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Sparkles size={12} strokeWidth={2.2} /> Surprise Me
            </button>

            <button
              type="button"
              className="copy-btn"
              onClick={handleShuffle}
              disabled={loading}
              title="Shuffle next batch of trending research topics"
              style={{
                fontSize: '11.5px',
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: 'var(--panel)',
                color: 'var(--text-dim)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <RefreshCw
                size={12}
                strokeWidth={2}
                style={{
                  animation: isShuffling ? 'spin 0.6s linear infinite' : 'none',
                }}
              />
              Shuffle
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setOffset(0)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isSelected
                    ? '1px solid var(--violet)'
                    : '1px solid var(--border)',
                  backgroundColor: isSelected
                    ? 'var(--violet-soft)'
                    : 'var(--panel-alt)',
                  color: isSelected ? 'var(--violet)' : 'var(--text-dim)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={12} strokeWidth={isSelected ? 2.4 : 1.8} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* 4 Trending Cards Grid */}
        <div className="suggestions-grid">
          {topics.map((item, idx) => (
            <button
              key={item.id || idx}
              className="suggestion-card animate-in"
              onClick={() => onSelectSuggestion?.(item.query)}
              type="button"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                padding: '14px 16px',
              }}
            >
              {/* Card Header Row: Icon + Velocity Tag */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <div className={`suggestion-icon-badge ${item.color_class || 'badge-violet'}`}>
                    {renderTopicIcon(item.icon)}
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {item.category_label || 'Frontier Research'}
                  </span>
                </div>

                {item.velocity_badge && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1.5px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {item.velocity_badge}
                  </span>
                )}
              </div>

              {/* Title & Query */}
              <div className="suggestion-info" style={{ width: '100%' }}>
                <div
                  className="suggestion-title"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </div>
                <div
                  className="suggestion-query"
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--violet)',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {item.query}
                </div>

                {/* Why It's Trending Contextual Briefing */}
                {item.why_trending && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-dim)',
                      lineHeight: 1.4,
                      borderTop: '1px solid var(--border)',
                      paddingTop: 6,
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-faint)', fontSize: '10px' }}>
                      Context:
                    </span>
                    <span style={{ fontStyle: 'italic' }}>{item.why_trending}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
