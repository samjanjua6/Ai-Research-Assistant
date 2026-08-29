import { useState, useEffect, useCallback } from 'react'
import {
  Compass,
  Flame,
  Clock,
  ShieldCheck,
  Search,
  GitFork,
  Heart,
  Share2,
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  Download,
  Users,
  Zap,
  ArrowRight,
  TrendingUp,
  Globe,
  Database,
  Filter,
} from 'lucide-react'
import {
  fetchDiscoverFeed,
  fetchDiscoverStats,
  upvoteReport,
} from '../../api/client'
import { ForkInquiryModal } from './ForkInquiryModal'
import { toast } from '../../context/ToastContext'

const CATEGORIES = [
  { id: 'all', label: 'All Frontier', icon: Globe },
  { id: 'ai', label: 'AI & Autonomy', icon: Zap },
  { id: 'biotech', label: 'Biotech & Medicine', icon: Sparkles },
  { id: 'energy', label: 'Clean Energy & Batteries', icon: Flame },
  { id: 'quantum', label: 'Quantum Tech', icon: Layers },
  { id: 'economics', label: 'Macro & Markets', icon: TrendingUp },
]

export default function PublicDiscoverShowcase({ onNavigateHome, onLaunchForkInquiry, onOpenPublicReport }) {
  const [reports, setReports] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [engineFilter, setEngineFilter] = useState('all')
  const [forkTargetReport, setForkTargetReport] = useState(null)
  const [clappedReports, setClappedReports] = useState({})

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDiscoverFeed({
        category: selectedCategory,
        sortBy,
        search: searchQuery,
        engine: engineFilter,
        limit: 30,
        offset: 0,
      })
      setReports(data.reports || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Failed to load discover feed:', err)
      toast.error('Could not load community discover feed.')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, sortBy, searchQuery, engineFilter])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchDiscoverStats()
      setStats(res)
    } catch (err) {
      console.warn('Could not fetch discover stats:', err)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeed()
    }, 150)
    return () => clearTimeout(timer)
  }, [loadFeed])

  const handleClap = async (e, r) => {
    e.stopPropagation()
    const reportId = r.id
    const prevCount = r.upvotes_count || 0

    // Optimistic UI update
    setReports((prev) =>
      prev.map((item) =>
        item.id === reportId ? { ...item, upvotes_count: prevCount + 1 } : item
      )
    )
    setClappedReports((prev) => ({ ...prev, [reportId]: (prev[reportId] || 0) + 1 }))
    toast.success('Clapped for this study!')

    try {
      await upvoteReport(reportId, 1)
    } catch (err) {
      console.error('Failed to register clap:', err)
    }
  }

  const handleShareReport = (e, r) => {
    e.stopPropagation()
    const shareUrl = r.share_token
      ? `${window.location.origin}/public/${r.share_token}`
      : `${window.location.origin}/#${r.id}`

    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Public research link copied to clipboard!')
    })
  }

  const handleDownloadBibTeX = (e, r) => {
    e.stopPropagation()
    const citeKey = `research_${r.id.slice(0, 8)}_2026`
    const bibContent = `@article{${citeKey},
  title = {${r.question.replace(/[{}]/g, '')}},
  year = {2026},
  journal = {Frontier Research Showcase},
  note = {Scrutinized ${r.sources_count} sources via ${r.engine || 'LangGraph'}}
}`
    const blob = new Blob([bibContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${citeKey}.bib`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('BibTeX reference downloaded!')
  }

  return (
    <div className="library-container animate-in">
      {/* ── Top Header & Global Telemetry Banner ── */}
      <div
        style={{
          padding: '24px 28px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(124, 106, 240, 0.14) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(124, 106, 240, 0.25)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, backgroundColor: 'rgba(124, 106, 240, 0.18)', color: 'var(--violet)', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              <Compass size={13} strokeWidth={2.4} /> Frontier Research Community Showcase
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Explore & Fork Public Empirical Inquiries
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '680px', lineHeight: 1.45 }}>
              Browse peer-reviewed and AI-synthesized research dossiers across AI, biotech, clean energy, and quantum hardware. 1-click fork to audit or expand under alternative methodology lenses.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={onNavigateHome}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
            }}
          >
            <Sparkles size={14} strokeWidth={2.2} />
            <span>Launch New Inquiry</span>
          </button>
        </div>

        {/* Global Telemetry Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Published Inquiries</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
              {stats?.total_published_studies || reports.length}
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Citations Scrutinized</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--cyan)', marginTop: 2 }}>
              {(stats?.total_citations_scrutinized || reports.length * 8).toLocaleString()}+
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Community Claps</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#f43f5e', marginTop: 2 }}>
              {(stats?.total_community_claps || 42).toLocaleString()}
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Forked Inquiries</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--violet)', marginTop: 2 }}>
              {stats?.total_forked_inquiries || 14}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Track Filter Pills ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 16,
        }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: isActive ? '1px solid var(--violet)' : '1px solid var(--border)',
                backgroundColor: isActive ? 'var(--violet)' : 'var(--surface-card)',
                color: isActive ? '#ffffff' : 'var(--text-dim)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Controls Bar (Search, Sorting & Engine) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '480px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search frontier inquiries, topics, or mechanisms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text)',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-muted)' }}>
            <Filter size={13} />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text)',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              <option value="trending">🔥 Trending (Claps & Views)</option>
              <option value="latest">⚡ Latest Publications</option>
              <option value="clapped">❤️ Most Clapped</option>
              <option value="confidence">🛡️ High Depth & Citations</option>
            </select>
          </div>

          {/* Engine Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-muted)' }}>
            <span>Engine:</span>
            <select
              value={engineFilter}
              onChange={(e) => setEngineFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text)',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Engines</option>
              <option value="langgraph">LangGraph StateGraph</option>
              <option value="crewai">CrewAI 4-Agent</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Feed Grid ── */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: 12, fontSize: '13.5px' }}>Loading frontier research feed...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <BookOpen size={36} strokeWidth={1.5} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text)' }}>No public research reports match this filter</h3>
          <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Try selecting "All Frontier" or searching with different keyphrases.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSelectedCategory('all')
              setSearchQuery('')
              setEngineFilter('all')
            }}
            style={{ fontSize: '12.5px', padding: '6px 14px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {reports.map((r) => {
            const hasClapped = Boolean(clappedReports[r.id])
            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 106, 240, 0.4)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onClick={() => {
                  if (onOpenPublicReport) {
                    onOpenPublicReport(r)
                  } else if (r.share_token) {
                    window.open(`/public/${r.share_token}`, '_blank')
                  }
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(124, 106, 240, 0.12)',
                          color: 'var(--violet)',
                        }}
                      >
                        {r.category || 'Frontier'}
                      </span>
                      {r.lens && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(6, 182, 212, 0.12)',
                            color: 'var(--cyan)',
                          }}
                        >
                          /{r.lens}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.is_verified_primary && (
                        <span
                          title="Verified Empirical Primary: Multi-source academic citations verified"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <ShieldCheck size={11} strokeWidth={2.2} /> Verified
                        </span>
                      )}
                      {r.is_top_forked && (
                        <span
                          title="Top Forked Study: Repeatedly branched by the community"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <GitFork size={11} strokeWidth={2.2} /> Popular
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {r.question}
                  </h3>

                  {/* Summary Snippet */}
                  {r.summary && (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '12.5px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {r.summary}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div>
                  {/* Meta Stats Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      paddingTop: 10,
                      borderTop: '1px solid var(--border)',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span>{r.sources_count} sources</span>
                      <span>•</span>
                      <span>{r.engine === 'crewai' ? 'CrewAI' : 'LangGraph'}</span>
                    </div>
                    {r.fork_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--violet)' }}>
                        <GitFork size={11} /> {r.fork_count} forks
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    {/* Clap Button */}
                    <button
                      type="button"
                      onClick={(e) => handleClap(e, r)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: hasClapped ? '1px solid #f43f5e' : '1px solid var(--border)',
                        backgroundColor: hasClapped ? 'rgba(244, 63, 94, 0.12)' : 'transparent',
                        color: hasClapped ? '#f43f5e' : 'var(--text-dim)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease',
                      }}
                      title="Clap for this research run"
                    >
                      <Heart size={13} fill={hasClapped ? '#f43f5e' : 'none'} strokeWidth={2} />
                      <span>{r.upvotes_count || 0}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* BibTeX Export */}
                      <button
                        type="button"
                        onClick={(e) => handleDownloadBibTeX(e, r)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          backgroundColor: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Download BibTeX Citation (.bib)"
                      >
                        <Download size={11} /> .bib
                      </button>

                      {/* Fork Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setForkTargetReport(r)
                        }}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 6,
                          border: '1px solid var(--violet)',
                          backgroundColor: 'rgba(124, 106, 240, 0.12)',
                          color: 'var(--violet)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="Fork this inquiry with a new command lens"
                      >
                        <GitFork size={12} strokeWidth={2.2} />
                        <span>Fork</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Fork Inquiry Modal ── */}
      {forkTargetReport && (
        <ForkInquiryModal
          report={forkTargetReport}
          onClose={() => setForkTargetReport(null)}
          onLaunchFork={(forkedQuestion, engine, parentId) => {
            if (onLaunchForkInquiry) {
              onLaunchForkInquiry(forkedQuestion, engine, parentId)
            }
          }}
        />
      )}
    </div>
  )
}
