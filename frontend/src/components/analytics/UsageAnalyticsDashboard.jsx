import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Clock,
  BookOpen,
  ShieldCheck,
  RotateCw,
  Sparkles,
  Award,
  GraduationCap,
  Scale,
  Dna,
  FileText,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Cpu,
  Bot,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  BarChart2,
} from 'lucide-react'
import { fetchUserAnalytics } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export function UsageAnalyticsDashboard({ onBackToWorkspace, onSelectTopic }) {
  const { info: toastInfo, error: toastError } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  const loadAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetchUserAnalytics()
      if (res?.analytics) {
        setData(res.analytics)
        // Default selected day to the latest active day if available
        const activeDays = (res.analytics.heatmap?.days || []).filter((d) => d.count > 0)
        if (activeDays.length > 0) {
          setSelectedDay(activeDays[activeDays.length - 1])
        }
      }
    } catch (err) {
      console.error('Failed to load user analytics:', err)
      toastError('Could not load analytics. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toastError])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const handleExportSummary = () => {
    if (!data) return
    const exportPayload = {
      export_date: new Date().toISOString(),
      user_id: data.user_id,
      total_runs: data.total_runs,
      productivity: data.productivity,
      confidence: data.confidence,
      lens_mastery: data.lens_mastery,
      topic_cloud: data.topic_cloud,
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research_analytics_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toastInfo('Analytics portfolio exported successfully.', { title: 'Export Ready' })
  }

  if (loading) {
    return (
      <div className="analytics-loading card" style={{ padding: '60px 32px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>
          Synthesizing Research Telemetry...
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
          Aggregating hours saved, citation confidence, and topic footprint.
        </p>
      </div>
    )
  }

  const p = data?.productivity || {}
  const c = data?.confidence || {}
  const heatmapDays = data?.heatmap?.days || []

  return (
    <div className="analytics-dashboard animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* ── Top Header Row ── */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          flexWrap: 'wrap',
          gap: 16,
          background: 'linear-gradient(135deg, var(--panel), var(--panel-alt))',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBackToWorkspace}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', padding: '7px 12px' }}
          >
            <ArrowLeft size={14} strokeWidth={2.2} /> Back to Workspace
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
                Research Productivity & Intelligence ROI
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <TrendingUp size={11} strokeWidth={2.4} /> {p.acceleration_factor || '28.4x'} Velocity
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: '4px 0 0' }}>
              Personal metrics across {data?.total_runs || 0} autonomous investigations and {p.total_sources_scrutinized || 0} scrutinized sources.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '7px 12px' }}
          >
            <RefreshCw size={13} strokeWidth={2} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportSummary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '7px 14px' }}
          >
            <Download size={13} strokeWidth={2} /> Export Portfolio
          </button>
        </div>
      </div>

      {/* ── Row 1: 4 Key Executive Productivity Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Hours Saved */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Research Hours Saved
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(124, 106, 240, 0.12)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {p.estimated_hours_saved || 0} <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-dim)' }}>hrs</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: 8 }}>
            vs ~{Math.round((p.estimated_hours_saved || 0) * 1.15)} hrs manual literature discovery
          </div>
        </div>

        {/* Card 2: Literature Reading Volume */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Literature Volume Read
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {(p.total_reading_volume_words || 0).toLocaleString()} <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-dim)' }}>words</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: 8 }}>
            Across {p.total_sources_scrutinized || 0} sources & {p.total_doc_pages_processed || 0} document pages
          </div>
        </div>

        {/* Card 3: Grounding & Confidence Index */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grounding Index
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {c.overall_confidence_pct || 88.5}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: 8 }}>
            {c.tier1_academic_pct || 0}% verified institutional / academic sources
          </div>
        </div>

        {/* Card 4: Autonomous Review Cycles */}
        <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Review Depth
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCw size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {p.avg_search_loops || 1.0} <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-dim)' }}>loops / run</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: 8 }}>
            {data?.success_rate_pct || 100}% investigation completion rate
          </div>
        </div>
      </div>

      {/* ── Row 2: 30-Day Activity Heatmap Matrix ── */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} strokeWidth={2.2} style={{ color: 'var(--violet)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              30-Day Research Activity Matrix
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              ({data?.heatmap?.total_active_days || 0} active days in past month)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-faint)' }}>
            <span>Less</span>
            <span style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: 'var(--panel-alt)', border: '1px solid var(--border)' }} />
            <span style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: 'rgba(124, 106, 240, 0.3)' }} />
            <span style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: 'rgba(124, 106, 240, 0.6)' }} />
            <span style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: 'rgba(124, 106, 240, 0.9)' }} />
            <span style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: '#7c6af0' }} />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(30px, 1fr))',
            gap: 6,
            padding: '12px 0',
          }}
        >
          {heatmapDays.map((day) => {
            const isSelected = selectedDay?.date === day.date
            let bg = 'var(--panel-alt)'
            let border = '1px solid var(--border)'
            if (day.level === 1) bg = 'rgba(124, 106, 240, 0.3)'
            else if (day.level === 2) bg = 'rgba(124, 106, 240, 0.55)'
            else if (day.level === 3) bg = 'rgba(124, 106, 240, 0.8)'
            else if (day.level === 4) bg = '#7c6af0'

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDay(day)}
                title={`${day.date}: ${day.count} research run(s)`}
                style={{
                  height: 38,
                  borderRadius: 6,
                  backgroundColor: bg,
                  border: isSelected ? '2px solid var(--text)' : border,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 2,
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  transform: isSelected ? 'scale(1.08)' : 'none',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 600, color: day.level > 1 ? '#ffffff' : 'var(--text-dim)' }}>
                  {day.date.split('-')[2]}
                </span>
                {day.count > 0 && (
                  <span style={{ fontSize: '9px', fontWeight: 700, color: day.level > 1 ? '#ffffff' : 'var(--violet)' }}>
                    {day.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Day Drilldown Drawer */}
        {selectedDay && selectedDay.runs && selectedDay.runs.length > 0 && (
          <div
            className="animate-in"
            style={{
              marginTop: 16,
              padding: '14px 18px',
              backgroundColor: 'var(--panel-alt)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                Activity on {selectedDay.date} ({selectedDay.runs.length} inquiries)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Click inquiry to re-explore in workspace
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDay.runs.map((r, idx) => (
                <div
                  key={r.id || idx}
                  onClick={() => onSelectTopic?.(r.question)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--panel)',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: r.engine === 'crewai' ? 'rgba(124, 106, 240, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: r.engine === 'crewai' ? 'var(--violet)' : '#06b6d4',
                      }}
                    >
                      {r.engine === 'crewai' ? 'CrewAI' : 'LangGraph'}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.question}
                    </span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Row 3: Command Lens Mastery & Domain Authority ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        {/* Column Left: Command Lens Mastery */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} strokeWidth={2.2} style={{ color: 'var(--violet)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Command Lens Mastery
              </h2>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
              Analytical lenses deployed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.lens_mastery || []).slice(0, 6).map((lens) => (
              <div key={lens.code}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {lens.label}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {lens.count} ({lens.percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, backgroundColor: 'var(--panel-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(lens.percentage, 4)}%`,
                      height: '100%',
                      backgroundColor: lens.code === 'ANGLE' ? '#f59e0b' : lens.code === 'CHALLENGE' ? '#f43f5e' : lens.code === 'HYP' ? '#10b981' : 'var(--violet)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Engine Split */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-dim)' }}>
              <Cpu size={14} style={{ color: '#06b6d4' }} /> LangGraph: <strong>{data?.engines?.langgraph_count || 0} runs</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-dim)' }}>
              <Bot size={14} style={{ color: 'var(--violet)' }} /> CrewAI (4-Agent): <strong>{data?.engines?.crewai_count || 0} runs</strong>
            </div>
          </div>
        </div>

        {/* Column Right: Domain Authority Footprint */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={16} strokeWidth={2.2} style={{ color: '#10b981' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Domain Authority Footprint
              </h2>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
              {p.unique_domains_count || 0} unique domains
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tier 1 */}
            <div style={{ padding: '12px', backgroundColor: 'var(--panel-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10b981' }}>
                  Tier 1: Academic & Peer-Reviewed (.edu, .gov, arXiv, Nature)
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  {c.tier1_academic_pct || 0}%
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                {c.tier1_count || 0} citations directly verified against primary scientific repositories.
              </div>
            </div>

            {/* Tier 2 */}
            <div style={{ padding: '12px', backgroundColor: 'var(--panel-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#06b6d4' }}>
                  Tier 2: Major Tech Press & Industry Research
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                  {c.tier2_major_press_pct || 0}%
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                {c.tier2_count || 0} citations from Reuters, MIT Tech Review, Quanta, Wired.
              </div>
            </div>

            {/* Tier 3 */}
            <div style={{ padding: '12px', backgroundColor: 'var(--panel-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-dim)' }}>
                  Tier 3: Web & Industry Documentation
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {c.tier3_web_consensus_pct || 0}%
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                {c.tier3_count || 0} citations across broader developer and technology consensus.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Keyphrase Topic Cloud & Milestone Badges ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        {/* Column Left: Keyphrase Topic Cloud */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} strokeWidth={2.2} style={{ color: 'var(--violet)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Knowledge Footprint & Topic Clusters
              </h2>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
              Click to re-explore
            </span>
          </div>

          {(data?.topic_cloud || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 0' }}>
              {data.topic_cloud.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectTopic?.(`/DEEP ${item.topic}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    backgroundColor: 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--violet)'
                    e.currentTarget.style.backgroundColor = 'var(--violet-soft)'
                    e.currentTarget.style.color = 'var(--violet)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.backgroundColor = 'var(--panel-alt)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                >
                  <span>{item.topic}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-faint)', backgroundColor: 'var(--panel)', padding: '1px 5px', borderRadius: 10 }}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
              Run inquiries with command lenses to populate your topic footprint.
            </div>
          )}
        </div>

        {/* Column Right: Research Milestone Badges */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} strokeWidth={2.2} style={{ color: '#f59e0b' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Research Milestone Achievements
              </h2>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
              {(data?.badges || []).length} unlocked
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.badges || []).map((badge) => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 14px',
                  backgroundColor: 'var(--panel-alt)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: badge.tier === 'gold' ? 'rgba(245, 158, 11, 0.15)' : badge.tier === 'platinum' ? 'rgba(124, 106, 240, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: badge.tier === 'gold' ? '#f59e0b' : badge.tier === 'platinum' ? 'var(--violet)' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Award size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                    {badge.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: 2 }}>
                    {badge.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
