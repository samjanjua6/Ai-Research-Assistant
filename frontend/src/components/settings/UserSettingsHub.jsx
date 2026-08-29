import { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Key,
  Brain,
  Palette,
  Mail,
  Shield,
  Save,
  Check,
  Zap,
  Users,
  Sparkles,
  Layers,
  Scale,
  FlaskConical,
  RotateCcw,
  Download,
  Trash2,
  Lock,
  ExternalLink,
  Info,
  Activity,
  Server,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  fetchUserSettings,
  updateUserSettings,
  testProviderKey,
} from '../../api/client'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../context/ToastContext'

const TABS = [
  { id: 'engine', label: 'Engine & Lenses', icon: Zap },
  { id: 'byok', label: 'BYOK API Keys', icon: Key },
  { id: 'persona', label: 'Persona & Domains', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Mail },
  { id: 'account', label: 'Account & Data', icon: Shield },
]

const ACCENT_COLORS = [
  { id: 'violet', label: 'Hyper Violet', color: '#7C6AF0', bg: 'rgba(124, 106, 240, 0.15)' },
  { id: 'emerald', label: 'Emerald Matrix', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  { id: 'cyan', label: 'Cyan Pulse', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
  { id: 'amber', label: 'Amber Flame', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  { id: 'rose', label: 'Rose Crimson', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)' },
]

const LENS_OPTIONS = [
  { id: '', label: 'Standard Deep Synthesis (Default)', icon: Sparkles },
  { id: '/DEEP', label: '/DEEP — Exhaustive Empirical Rigor', icon: Sparkles },
  { id: '/ANGLE', label: '/ANGLE — Comparative Architecture Matrix', icon: Layers },
  { id: '/CHALLENGE', label: '/CHALLENGE — Adversarial Counter-Audit', icon: Scale },
  { id: '/HYP', label: '/HYP — Empirical Falsifiable Hypotheses', icon: FlaskConical },
  { id: '/VOICES', label: '/VOICES — Stakeholder & Market Perspectives', icon: Users },
]

export default function UserSettingsHub({ onBackToWorkspace, onChangePassword, onDeleteAccount }) {
  const { user } = useAuth()
  const { theme, setTheme, accent, setAccent } = useTheme()
  const [activeTab, setActiveTab] = useState('engine')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    default_engine: 'langgraph',
    default_lens: '',
    default_loops: 2,
    custom_instructions: '',
    preferred_domains: '',
    theme_mode: 'system',
    accent_color: 'violet',
    email_on_complete: true,
    email_weekly_digest: false,
    custom_groq_key: '',
    custom_openai_key: '',
    custom_anthropic_key: '',
    custom_openrouter_key: '',
    custom_model: '',
  })

  // Provider test states
  const [testResults, setTestResults] = useState({})
  const [testingProvider, setTestingProvider] = useState(null)
  const [showKey, setShowKey] = useState({})

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUserSettings()
      setFormData({
        default_engine: data.default_engine || 'langgraph',
        default_lens: data.default_lens || '',
        default_loops: data.default_loops || 2,
        custom_instructions: data.custom_instructions || '',
        preferred_domains: data.preferred_domains || '',
        theme_mode: data.theme_mode || 'system',
        accent_color: data.accent_color || 'violet',
        email_on_complete: Boolean(data.email_on_complete),
        email_weekly_digest: Boolean(data.email_weekly_digest),
        custom_groq_key: data.custom_groq_key_masked || '',
        custom_openai_key: data.custom_openai_key_masked || '',
        custom_anthropic_key: data.custom_anthropic_key_masked || '',
        custom_openrouter_key: data.custom_openrouter_key_masked || '',
        custom_model: data.custom_model || '',
      })
      if (data.accent_color) {
        setAccent(data.accent_color)
      }
    } catch (err) {
      console.error('Failed to load user settings:', err)
      toast.error('Could not load user settings.')
    } finally {
      setLoading(false)
    }
  }, [setAccent])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUserSettings(formData)
      toast.success('Settings and preferences saved!')
    } catch (err) {
      console.error('Failed to update settings:', err)
      toast.error(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleTestKey = async (provider) => {
    const keyField = `custom_${provider}_key`
    const apiKey = formData[keyField]
    if (!apiKey || apiKey.includes('••••')) {
      toast.info('Please enter a new API key to test connection.')
      return
    }

    setTestingProvider(provider)
    setTestResults((prev) => ({ ...prev, [provider]: null }))

    try {
      const res = await testProviderKey(provider, apiKey, formData.custom_model || null)
      setTestResults((prev) => ({ ...prev, [provider]: res }))
      toast.success(`Connected to ${provider.toUpperCase()} in ${res.latency_ms}ms!`)
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { status: 'error', error: err.message },
      }))
      toast.error(err.message || `Failed to connect to ${provider.toUpperCase()}`)
    } finally {
      setTestingProvider(null)
    }
  }

  const handleExportData = () => {
    const exportObj = {
      export_date: new Date().toISOString(),
      user: {
        name: user?.name,
        email: user?.email,
        role: user?.role,
      },
      settings: {
        ...formData,
        custom_groq_key: '[ENCRYPTED]',
        custom_openai_key: '[ENCRYPTED]',
        custom_anthropic_key: '[ENCRYPTED]',
        custom_openrouter_key: '[ENCRYPTED]',
      },
    }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research_profile_backup_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Profile and settings exported to JSON!')
  }

  return (
    <div className="library-container animate-in" style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, backgroundColor: 'rgba(124, 106, 240, 0.14)', color: 'var(--violet)', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            <Settings size={13} strokeWidth={2.4} /> Power User Preferences
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
            Settings & Custom API Key Hub
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Configure default multi-agent engines, custom API keys, persona instructions, and theme palettes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBackToWorkspace}
            style={{ fontSize: '13px', padding: '8px 16px', borderRadius: 8 }}
          >
            Back to Workspace
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              fontSize: '13px',
              padding: '8px 18px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
            }}
          >
            <Save size={14} strokeWidth={2.2} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Tabs + Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isActive ? 'var(--violet)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-dim)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content Pane */}
        <div
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '24px 28px',
            minHeight: '480px',
          }}
        >
          {/* TAB 1: Engine & Lenses */}
          {activeTab === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Default Multi-Agent Execution Engine
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Choose which agent orchestration architecture runs by default for new investigations.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setFormData({ ...formData, default_engine: 'langgraph' })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: formData.default_engine === 'langgraph' ? '1.5px solid var(--cyan)' : '1px solid var(--border)',
                      backgroundColor: formData.default_engine === 'langgraph' ? 'rgba(6, 182, 212, 0.1)' : 'var(--surface-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan)', fontWeight: 700, fontSize: '13.5px' }}>
                      <Zap size={16} strokeWidth={2.2} /> LangGraph StateGraph (Fast)
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Dynamic self-correcting graph architecture with sub-minute synthesis loops and real-time streaming.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, default_engine: 'crewai' })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: formData.default_engine === 'crewai' ? '1.5px solid var(--violet)' : '1px solid var(--border)',
                      backgroundColor: formData.default_engine === 'crewai' ? 'rgba(124, 106, 240, 0.1)' : 'var(--surface-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--violet)', fontWeight: 700, fontSize: '13.5px' }}>
                      <Users size={16} strokeWidth={2.2} /> CrewAI 4-Agent Team (Collaborative)
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Specialized 4-agent team (Strategist, Scraper, Fact-Checker, Lead Synthesizer) with rigorous fact audits.
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Command Lens */}
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Default Command Lens
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Automatically pre-fills your preferred analytical perspective into the workspace prompt box.
                </p>
                <select
                  value={formData.default_lens}
                  onChange={(e) => setFormData({ ...formData, default_lens: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                >
                  {LENS_OPTIONS.map((lens) => (
                    <option key={lens.id} value={lens.id}>
                      {lens.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Search Loops */}
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Default Search Depth Loops
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Controls how many iterative search-and-refine loops the planner executes.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[1, 2, 3, 4].map((loop) => (
                    <button
                      key={loop}
                      type="button"
                      onClick={() => setFormData({ ...formData, default_loops: loop })}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: formData.default_loops === loop ? '1.5px solid var(--violet)' : '1px solid var(--border)',
                        backgroundColor: formData.default_loops === loop ? 'rgba(124, 106, 240, 0.12)' : 'var(--surface-muted)',
                        color: formData.default_loops === loop ? 'var(--violet)' : 'var(--text-dim)',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {loop} {loop === 1 ? 'Loop (Quick)' : loop === 2 ? 'Loops (Standard)' : loop === 3 ? 'Loops (Deep)' : 'Loops (Max)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BYOK API Keys */}
          {activeTab === 'byok' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'rgba(124, 106, 240, 0.08)', border: '1px solid rgba(124, 106, 240, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', fontWeight: 700, color: 'var(--violet)' }}>
                  <Key size={15} /> Bring Your Own Key (BYOK) Architecture
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Provide your personal API keys to bypass shared rate limits and unlock custom models (e.g. Claude 3.5 Sonnet, DeepSeek-R1, GPT-4o). Keys are encrypted at rest.
                </p>
              </div>

              {/* Provider Key Inputs */}
              {[
                { id: 'groq', name: 'Groq API Key', prefix: 'gsk_', placeholder: 'gsk_••••••••••••••••' },
                { id: 'openai', name: 'OpenAI API Key', prefix: 'sk-', placeholder: 'sk-••••••••••••••••' },
                { id: 'anthropic', name: 'Anthropic API Key', prefix: 'sk-ant-', placeholder: 'sk-ant-••••••••••••••••' },
                { id: 'openrouter', name: 'OpenRouter / Perplexity Key', prefix: 'sk-or-', placeholder: 'sk-or-••••••••••••••••' },
              ].map((prov) => {
                const keyField = `custom_${prov.id}_key`
                const isTesting = testingProvider === prov.id
                const testRes = testResults[prov.id]
                const isVisible = showKey[prov.id]

                return (
                  <div key={prov.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        {prov.name}
                      </span>
                      {testRes && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: testRes.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            color: testRes.status === 'success' ? '#10b981' : '#f43f5e',
                          }}
                        >
                          {testRes.status === 'success' ? `✓ Verified (${testRes.latency_ms}ms)` : '✕ Connection Failed'}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type={isVisible ? 'text' : 'password'}
                          value={formData[keyField] || ''}
                          onChange={(e) => setFormData({ ...formData, [keyField]: e.target.value })}
                          placeholder={prov.placeholder}
                          style={{
                            width: '100%',
                            padding: '8px 36px 8px 12px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--text)',
                            fontSize: '12.5px',
                            fontFamily: 'var(--font-mono)',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((prev) => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            padding: 2,
                          }}
                        >
                          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTestKey(prov.id)}
                        disabled={isTesting}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--surface-card)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isTesting ? 'Pinging...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Custom Model Override */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Custom Model Override (Optional)
                </label>
                <input
                  type="text"
                  value={formData.custom_model || ''}
                  onChange={(e) => setFormData({ ...formData, custom_model: e.target.value })}
                  placeholder="e.g. claude-3-5-sonnet-20241022, deepseek/deepseek-r1, gpt-4o"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Persona & Domains */}
          {activeTab === 'persona' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Custom Researcher Persona & Synthesis Directives
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Injected directly into the lead synthesis agent for every investigation.
                </p>
                <textarea
                  rows={5}
                  value={formData.custom_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                  placeholder="e.g., 'Always structure conclusions around statistical confidence intervals. Emphasize patent landscapes and commercial unit economics for deep tech inquiries.'"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    lineHeight: 1.45,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Preferred Institutional Domains (Whitelist)
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Comma-separated domains to prioritize in source ranking algorithms.
                </p>
                <input
                  type="text"
                  value={formData.preferred_domains || ''}
                  onChange={(e) => setFormData({ ...formData, preferred_domains: e.target.value })}
                  placeholder="nature.com, arxiv.org, ieee.org, nih.gov, biorxiv.org"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: Appearance & Themes */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Theme Mode */}
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Theme Mode
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Select light, dark, or automatic system appearance.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {['dark', 'light', 'system'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setTheme(m)
                        setFormData({ ...formData, theme_mode: m })
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: theme === m ? '1.5px solid var(--violet)' : '1px solid var(--border)',
                        backgroundColor: theme === m ? 'rgba(124, 106, 240, 0.12)' : 'var(--surface-muted)',
                        color: theme === m ? 'var(--violet)' : 'var(--text-dim)',
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Palette */}
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Accent Color Palette
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Personalize the primary accent color across buttons, chips, and badges.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {ACCENT_COLORS.map((pal) => {
                    const isSelected = accent === pal.id
                    return (
                      <div
                        key={pal.id}
                        onClick={() => {
                          setAccent(pal.id)
                          setFormData({ ...formData, accent_color: pal.id })
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: 8,
                          border: isSelected ? `2px solid ${pal.color}` : '1px solid var(--border)',
                          backgroundColor: isSelected ? pal.bg : 'var(--surface-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: pal.color }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: isSelected ? pal.color : 'var(--text)' }}>
                          {pal.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Email Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                    Research Job Completion Briefing
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Receive an executive summary email via Brevo with citation count and direct report link when research finishes.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.email_on_complete}
                  onChange={(e) => setFormData({ ...formData, email_on_complete: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--violet)' }}
                />
              </div>

              <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                    Weekly Frontier Trends Digest
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Receive a curated weekly email digest of top trending breakthroughs across AI, biotech, clean energy, and quantum tech.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.email_weekly_digest}
                  onChange={(e) => setFormData({ ...formData, email_weekly_digest: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--violet)' }}
                />
              </div>
            </div>
          )}

          {/* TAB 6: Account & Data */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-muted)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Researcher Account
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>Name: <strong style={{ color: 'var(--text)' }}>{user?.name}</strong></div>
                  <div>Email: <strong style={{ color: 'var(--text)' }}>{user?.email}</strong></div>
                  <div>Role: <strong style={{ color: 'var(--violet)', textTransform: 'capitalize' }}>{user?.role || 'Researcher'}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {onChangePassword && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onChangePassword}
                    style={{ fontSize: '12.5px', padding: '8px 16px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Lock size={13} /> Change Password
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportData}
                  style={{ fontSize: '12.5px', padding: '8px 16px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={13} /> Export Settings (.json)
                </button>

                {onDeleteAccount && (
                  <button
                    type="button"
                    onClick={onDeleteAccount}
                    style={{
                      fontSize: '12.5px',
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      backgroundColor: 'rgba(244, 63, 94, 0.1)',
                      color: '#f43f5e',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={13} /> Delete Account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
