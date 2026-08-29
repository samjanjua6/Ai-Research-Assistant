import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ArrowLeft,
  Folder,
  FolderPlus,
  Star,
  Search,
  Filter,
  Layers,
  Scale,
  Sparkles,
  Download,
  Trash2,
  Tag,
  FileText,
  Clock,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Plus,
  Dna,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import {
  fetchLibraryRuns,
  fetchCollections,
  deleteCollection,
  toggleRunBookmark,
  updateRunTags,
  updateRunNotes,
  modifyCollectionRuns,
} from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { NewCollectionModal } from './NewCollectionModal'
import { MasterDossierModal } from './MasterDossierModal'
import { ComparativeReadingModal } from './ComparativeReadingModal'

export function ResearchLibraryHub({ onBackToWorkspace, onOpenRun }) {
  const { info: toastInfo, error: toastError } = useToast()

  // Data states
  const [runs, setRuns] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [activeTab, setActiveTab] = useState('all') // 'all', 'starred', collection_id, smart_filter
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEngine, setSelectedEngine] = useState('all')
  const [selectedLens, setSelectedLens] = useState('all')
  const [selectedDate, setSelectedDate] = useState('all')

  // Selection & Modal states
  const [selectedRunIds, setSelectedRunIds] = useState(new Set())
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showDossierModal, setShowDossierModal] = useState(false)
  const [compareRuns, setCompareRuns] = useState(null)
  const [expandedNotesId, setExpandedNotesId] = useState(null)
  const [editingNotesText, setEditingNotesText] = useState('')
  const [newTagInputId, setNewTagInputId] = useState(null)
  const [newTagText, setNewTagText] = useState('')

  // Load Library Data
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const [runsRes, collRes] = await Promise.all([
        fetchLibraryRuns({ limit: 100 }),
        fetchCollections(),
      ])

      if (runsRes?.runs) setRuns(runsRes.runs)
      if (collRes?.collections) setCollections(collRes.collections)
    } catch (err) {
      console.error('Failed to load library:', err)
      toastError('Could not load library. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toastError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered runs calculation
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      // Tab filter
      if (activeTab === 'starred' && !r.is_bookmarked) return false
      if (activeTab.startsWith('coll_')) {
        const cId = activeTab.replace('coll_', '')
        const inColl = (r.collections || []).some((c) => c.id === cId)
        if (!inColl) return false
      }
      // Smart filters
      if (activeTab === 'smart_peer_reviewed' && (r.sources_count || 0) < 3) return false
      if (activeTab === 'smart_high_intensity' && (r.loop_count || 0) < 2 && !r.question.includes('/DEEP')) return false
      if (activeTab === 'smart_dialectical' && !r.question.includes('/ANGLE') && !r.question.includes('/CHALLENGE')) return false
      if (activeTab === 'smart_hypotheses' && !r.question.includes('/HYP')) return false

      // Engine filter
      if (selectedEngine !== 'all' && !r.engine?.toLowerCase().includes(selectedEngine)) return false

      // Lens filter
      if (selectedLens !== 'all' && !r.question.toUpperCase().includes(`/${selectedLens}`)) return false

      // Date range filter
      if (selectedDate !== 'all') {
        const runDate = new Date(r.created_at)
        const now = new Date()
        if (selectedDate === 'today') {
          if (runDate.toDateString() !== now.toDateString()) return false
        } else if (selectedDate === 'week') {
          const weekAgo = new Date(now.setDate(now.getDate() - 7))
          if (runDate < weekAgo) return false
        } else if (selectedDate === 'month') {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
          if (runDate < monthAgo) return false
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase()
        const matchQ = r.question?.toLowerCase().includes(s)
        const matchSum = r.summary?.toLowerCase().includes(s)
        const matchNotes = r.user_notes?.toLowerCase().includes(s)
        const matchTag = (r.tags || []).some((t) => t.toLowerCase().includes(s))
        if (!matchQ && !matchSum && !matchNotes && !matchTag) return false
      }

      return true
    })
  }, [runs, activeTab, selectedEngine, selectedLens, selectedDate, searchTerm])

  // Toggle Bookmark
  const handleToggleBookmark = async (runId, e) => {
    e?.stopPropagation()
    try {
      const res = await toggleRunBookmark(runId)
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, is_bookmarked: res.is_bookmarked } : r))
      )
    } catch (err) {
      toastError('Failed to update bookmark.')
    }
  }

  // Toggle Selection
  const toggleSelectRun = (runId, e) => {
    e?.stopPropagation()
    setSelectedRunIds((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedRunIds.size === filteredRuns.length) {
      setSelectedRunIds(new Set())
    } else {
      setSelectedRunIds(new Set(filteredRuns.map((r) => r.id)))
    }
  }

  // Save Notes
  const handleSaveNotes = async (runId) => {
    try {
      await updateRunNotes(runId, editingNotesText)
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, user_notes: editingNotesText } : r))
      )
      setExpandedNotesId(null)
      toastInfo('Research notes saved.', { title: 'Notes Updated' })
    } catch (err) {
      toastError('Failed to save notes.')
    }
  }

  // Add Tag
  const handleAddTag = async (runId, existingTags) => {
    if (!newTagText.trim()) return
    const updated = [...(existingTags || []), newTagText.trim().toLowerCase()]
    try {
      const res = await updateRunTags(runId, updated)
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, tags: res.tags } : r))
      )
      setNewTagInputId(null)
      setNewTagText('')
    } catch (err) {
      toastError('Failed to add tag.')
    }
  }

  // Remove Tag
  const handleRemoveTag = async (runId, existingTags, tagToRemove) => {
    const updated = (existingTags || []).filter((t) => t !== tagToRemove)
    try {
      const res = await updateRunTags(runId, updated)
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, tags: res.tags } : r))
      )
    } catch (err) {
      toastError('Failed to remove tag.')
    }
  }

  // Delete Folder
  const handleDeleteCollection = async (collId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this folder? Research reports will remain safe in your library.')) {
      return
    }
    try {
      await deleteCollection(collId)
      setCollections((prev) => prev.filter((c) => c.id !== collId))
      if (activeTab === `coll_${collId}`) setActiveTab('all')
      toastInfo('Folder deleted.', { title: 'Folder Removed' })
    } catch (err) {
      toastError('Failed to delete folder.')
    }
  }

  // Selected Runs for Master Dossier
  const selectedRunsList = useMemo(() => {
    return runs.filter((r) => selectedRunIds.has(r.id))
  }, [runs, selectedRunIds])

  const handleLaunchCompare = () => {
    if (selectedRunsList.length !== 2) {
      toastError('Please select exactly 2 research reports to compare side-by-side.')
      return
    }
    setCompareRuns({ runA: selectedRunsList[0], runB: selectedRunsList[1] })
  }

  return (
    <div className="library-hub animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* ── Top Bar ── */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          flexWrap: 'wrap',
          gap: 12,
          background: 'linear-gradient(135deg, var(--panel), var(--panel-alt))',
          border: '1px solid var(--border)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBackToWorkspace}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px', padding: '6px 10px', flexShrink: 0 }}
          >
            <ArrowLeft size={14} strokeWidth={2.2} /> Back to Workspace
          </button>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Research Library & Collections Hub
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Organize investigations into folders, star favorites, and synthesize cross-study Master Dossiers.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '6px 10px' }}
          >
            <RefreshCw size={13} strokeWidth={2} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewFolderModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '6px 12px' }}
          >
            <FolderPlus size={14} strokeWidth={2} /> New Folder
          </button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar + Main List ── */}
      <div className="library-layout-grid">
        
        {/* ── Left Sidebar Navigation ── */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Primary Views */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: activeTab === 'all' ? 'var(--violet-soft)' : 'transparent',
                color: activeTab === 'all' ? 'var(--violet)' : 'var(--text)',
                fontWeight: activeTab === 'all' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} strokeWidth={2} /> All Investigations
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {runs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('starred')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: activeTab === 'starred' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: activeTab === 'starred' ? '#f59e0b' : 'var(--text)',
                fontWeight: activeTab === 'starred' ? 700 : 500,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={15} strokeWidth={2} style={{ fill: activeTab === 'starred' ? '#f59e0b' : 'none' }} />
                Starred / Favorites
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {runs.filter((r) => r.is_bookmarked).length}
              </span>
            </button>
          </div>

          {/* Themed Folders */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Themed Folders
              </span>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--violet)', cursor: 'pointer', padding: 2 }}
                title="Create Folder"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {collections.map((coll) => {
                const isActive = activeTab === `coll_${coll.id}`
                return (
                  <div
                    key={coll.id}
                    onClick={() => setActiveTab(`coll_${coll.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 6,
                      backgroundColor: isActive ? 'var(--panel-alt)' : 'transparent',
                      color: isActive ? 'var(--text)' : 'var(--text-dim)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      borderLeft: isActive ? `3px solid ${coll.color || 'var(--violet)'}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <Folder size={14} style={{ color: coll.color || 'var(--violet)', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {coll.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                        {coll.item_count || 0}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCollection(coll.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2 }}
                        title="Delete Folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {collections.length === 0 && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', padding: '6px 4px' }}>
                  No folders yet. Click "+" to create one.
                </div>
              )}
            </div>
          </div>

          {/* Smart Auto-Collections */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, padding: '0 4px' }}>
              Smart Auto-Collections
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <button
                type="button"
                onClick={() => setActiveTab('smart_peer_reviewed')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: activeTab === 'smart_peer_reviewed' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  color: activeTab === 'smart_peer_reviewed' ? '#10b981' : 'var(--text-dim)',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ShieldCheck size={14} style={{ color: '#10b981' }} /> Peer-Reviewed Primary
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smart_high_intensity')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: activeTab === 'smart_high_intensity' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  color: activeTab === 'smart_high_intensity' ? '#06b6d4' : 'var(--text-dim)',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Zap size={14} style={{ color: '#06b6d4' }} /> High-Intensity Runs
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smart_dialectical')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: activeTab === 'smart_dialectical' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: activeTab === 'smart_dialectical' ? '#f59e0b' : 'var(--text-dim)',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Scale size={14} style={{ color: '#f59e0b' }} /> Dialectical / Controversial
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('smart_hypotheses')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: activeTab === 'smart_hypotheses' ? 'rgba(124, 106, 240, 0.12)' : 'transparent',
                  color: activeTab === 'smart_hypotheses' ? 'var(--violet)' : 'var(--text-dim)',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Dna size={14} style={{ color: 'var(--violet)' }} /> Empirical Hypotheses
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Area: Filters, Batch Toolbar & Reports List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Multi-Criteria Filter Bar */}
          <div
            className="card"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type="text"
                className="input-text"
                placeholder="Search inquiries, notes, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12.5px' }}
              />
            </div>

            {/* Dropdown Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Engine */}
              <select
                className="input-text"
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="all">All Engines</option>
                <option value="langgraph">LangGraph</option>
                <option value="crewai">CrewAI</option>
              </select>

              {/* Lens */}
              <select
                className="input-text"
                value={selectedLens}
                onChange={(e) => setSelectedLens(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="all">All Lenses</option>
                <option value="DEEP">/DEEP (Exhaustive)</option>
                <option value="ANGLE">/ANGLE (Comparative)</option>
                <option value="CHALLENGE">/CHALLENGE (Rebuttal)</option>
                <option value="HYP">/HYP (Hypothesis)</option>
                <option value="VOICES">/VOICES (Stakeholders)</option>
                <option value="ARTEFACT">/ARTEFACT (Mind-Map)</option>
                <option value="TIMELINE">/TIMELINE (Milestones)</option>
              </select>

              {/* Date */}
              <select
                className="input-text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
          </div>

          {/* Batch Productivity Action Bar */}
          {selectedRunIds.size > 0 && (
            <div
              className="card animate-in"
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--panel-alt)',
                borderColor: 'var(--violet)',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', fontWeight: 600 }}
                >
                  <CheckSquare size={15} style={{ color: 'var(--violet)' }} />
                  {selectedRunIds.size} Selected
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selectedRunIds.size === 2 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleLaunchCompare}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '5px 10px' }}
                  >
                    <Scale size={13} strokeWidth={2.2} /> Compare Side-by-Side
                  </button>
                )}

                {selectedRunIds.size >= 2 && selectedRunIds.size <= 5 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowDossierModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '5px 12px' }}
                  >
                    <Sparkles size={13} strokeWidth={2.2} /> Generate Master Synthesis ({selectedRunIds.size})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reports Card List */}
          {loading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Loading Research Library...</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <FileText size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
                No Investigations Found
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', maxWidth: 400, margin: '0 auto' }}>
                No research runs matched your active folder or filter criteria.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredRuns.map((r) => {
                const isSelected = selectedRunIds.has(r.id)
                const isNotesOpen = expandedNotesId === r.id

                return (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderColor: isSelected ? 'var(--violet)' : 'var(--border)',
                      backgroundColor: isSelected ? 'rgba(124, 106, 240, 0.04)' : 'var(--panel)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, width: '100%', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectRun(r.id, e)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isSelected ? 'var(--violet)' : 'var(--text-faint)', flexShrink: 0 }}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>

                        {/* Bookmark Star */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleBookmark(r.id, e)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: r.is_bookmarked ? '#f59e0b' : 'var(--text-faint)', flexShrink: 0 }}
                          title={r.is_bookmarked ? 'Remove Star' : 'Star Inquiry'}
                        >
                          <Star size={16} style={{ fill: r.is_bookmarked ? '#f59e0b' : 'none' }} />
                        </button>

                        {/* Title */}
                        <h3
                          onClick={() => onOpenRun?.(r.id, r.question)}
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text)',
                            margin: 0,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {r.question}
                        </h3>
                      </div>

                      {/* Engine badge & Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 4,
                            backgroundColor: r.engine === 'crewai' ? 'rgba(124, 106, 240, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                            color: r.engine === 'crewai' ? 'var(--violet)' : '#06b6d4',
                          }}
                        >
                          {r.engine === 'crewai' ? 'CrewAI' : 'LangGraph'}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Summary Excerpt */}
                    {r.summary && (
                      <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.summary}
                      </p>
                    )}

                    {/* Footer Row: Tags, Folders, Sources, Notes Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {/* Folders */}
                        {(r.collections || []).map((c) => (
                          <span
                            key={c.id}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 12,
                              backgroundColor: 'var(--panel-alt)',
                              border: `1px solid ${c.color || 'var(--violet)'}`,
                              color: 'var(--text)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Folder size={11} style={{ color: c.color || 'var(--violet)' }} /> {c.name}
                          </span>
                        ))}

                        {/* Tags */}
                        {(r.tags || []).map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-dim)',
                              backgroundColor: 'var(--panel-alt)',
                              border: '1px solid var(--border)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            #{t}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(r.id, r.tags, t)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 0 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}

                        {/* Add Tag Inline */}
                        {newTagInputId === r.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              className="input-text"
                              value={newTagText}
                              onChange={(e) => setNewTagText(e.target.value)}
                              placeholder="tag..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTag(r.id, r.tags)
                                else if (e.key === 'Escape') setNewTagInputId(null)
                              }}
                              style={{ padding: '2px 6px', fontSize: '11px', width: 70 }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleAddTag(r.id, r.tags)}
                              style={{ padding: '2px 6px', fontSize: '11px' }}
                            >
                              Add
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewTagInputId(r.id)
                              setNewTagText('')
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            <Plus size={11} /> Tag
                          </button>
                        )}
                      </div>

                      {/* Right Meta Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>
                          {r.sources_count || 0} sources
                        </span>

                        {/* Notes toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isNotesOpen) {
                              setExpandedNotesId(null)
                            } else {
                              setExpandedNotesId(r.id)
                              setEditingNotesText(r.user_notes || '')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: r.user_notes ? 'var(--violet)' : 'var(--text-faint)',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: r.user_notes ? 600 : 400,
                          }}
                        >
                          <FileText size={12} /> {r.user_notes ? 'Notes' : '+ Note'}
                        </button>

                        {/* View Report Button */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onOpenRun?.(r.id, r.question)}
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                        >
                          View Study
                        </button>
                      </div>
                    </div>

                    {/* Inline Notes Editor */}
                    {isNotesOpen && (
                      <div className="animate-in" style={{ marginTop: 6, padding: '10px 12px', backgroundColor: 'var(--panel-alt)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <textarea
                          className="input-text"
                          rows={2}
                          value={editingNotesText}
                          onChange={(e) => setEditingNotesText(e.target.value)}
                          placeholder="Attach private annotations or takeaways..."
                          style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setExpandedNotesId(null)}
                            style={{ padding: '3px 8px', fontSize: '11.5px' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSaveNotes(r.id)}
                            style={{ padding: '3px 10px', fontSize: '11.5px' }}
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showNewFolderModal && (
        <NewCollectionModal
          onClose={() => setShowNewFolderModal(false)}
          onCreated={(newColl) => {
            setCollections((prev) => [...prev, newColl])
          }}
        />
      )}

      {showDossierModal && (
        <MasterDossierModal
          selectedRuns={selectedRunsList}
          onClose={() => setShowDossierModal(false)}
          onDossierCreated={() => {
            loadData(true)
            setSelectedRunIds(new Set())
          }}
        />
      )}

      {compareRuns && (
        <ComparativeReadingModal
          runA={compareRuns.runA}
          runB={compareRuns.runB}
          onClose={() => setCompareRuns(null)}
          onOpenRun={onOpenRun}
        />
      )}
    </div>
  )
}
