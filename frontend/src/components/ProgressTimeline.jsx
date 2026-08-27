import { useState } from 'react'
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Users,
  Zap,
  Microscope,
  Search,
  FileEdit,
  ShieldCheck,
} from 'lucide-react'

/* ── Helpers ──────────────────────────────────────────────────── */

/**
 * Convert raw SSE step events into a structured timeline for LangGraph.
 */
function buildTimeline(steps) {
  const planStep      = steps.find(s => s.node === 'plan_steps')
  const initialSearch = steps.find(s => s.node === 'search_web'   && (s.loop === 0 || s.loop == null))
  const initialDraft  = steps.find(s => s.node === 'draft_report' && (s.loop === 0 || s.loop == null))
  const finalizeStep  = steps.find(s => s.node === 'finalize_report')

  const reviews = steps.filter(s => s.node === 'review_draft')

  const loops = reviews.map((review, idx) => {
    const reviewPos  = steps.indexOf(review)
    const nextReview = reviews[idx + 1]
    const endPos     = nextReview ? steps.indexOf(nextReview) : steps.length

    const after = steps.slice(reviewPos + 1, endPos)

    return {
      number:     idx + 1,
      verdict:    review.payload?.gaps_found ? 'revise' : 'approved',
      notes:      review.payload?.review_notes || '',
      didSearch:  after.some(s => s.node === 'search_web'),
      didRedraft: after.some(s => s.node === 'draft_report'),
    }
  })

  return { planStep, initialSearch, initialDraft, loops, finalizeStep }
}

/* ── StepItem — accordion ──────────────────────────────────────── */
function StepItem({ label, chips = [], children, isDone, isActive, defaultOpen = false, icon: Icon = null }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <li className={`step${isDone ? ' step-done' : isActive ? ' step-active' : ''}`}>
      <div className="step-gutter">
        <span className="step-node" />
      </div>
      <div className="step-body animate-in">
        <button className="step-toggle" onClick={() => setOpen(o => !o)}>
          <span className="step-toggle-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {Icon && <Icon size={14} strokeWidth={2} />}
            <span>{label}</span>
          </span>
          {chips.length > 0 && (
            <span className="step-toggle-chips">
              {chips.map((c, i) => (
                <span key={i} className={`chip${c.variant ? ` chip-${c.variant}` : ''}`}>
                  {c.text}
                </span>
              ))}
            </span>
          )}
          <span className={`step-chevron${open ? ' open' : ''}`}>
            <ChevronDown size={14} strokeWidth={2} />
          </span>
        </button>

        <div className={`step-details${open ? ' open' : ''}`}>
          <div className="step-details-inner">
            <div className="step-details-body">{children}</div>
          </div>
        </div>
      </div>
    </li>
  )
}

/* ── LoopItem — collapsible refinement row ─────────────────────── */
function LoopItem({ loop, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const isApproved = loop.verdict === 'approved'

  return (
    <div className="loop-item">
      <button
        className={`loop-row${isApproved ? ' loop-row-approved' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`loop-sq${isApproved ? ' loop-sq-approved' : ' loop-sq-revise'}`} />
        <span className="loop-label">Loop {loop.number}</span>
        <span className={`verdict${isApproved ? ' verdict-approved' : ' verdict-revise'}`}>
          {isApproved ? (
            <>
              <CheckCircle2 size={11} strokeWidth={2.2} /> Approved
            </>
          ) : (
            <>
              <AlertCircle size={11} strokeWidth={2.2} /> Needs revision
            </>
          )}
        </span>
      </button>

      <div className={`step-details${open ? ' open' : ''}`}>
        <div className="step-details-inner">
          <div className="loop-details-body">
            {loop.notes && (
              <p className="reviewer-note">"{loop.notes}"</p>
            )}
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {loop.didSearch  && <li>Searched the web — new sources found</li>}
              {loop.didRedraft && <li>Updated draft</li>}
              {!loop.didSearch && !loop.didRedraft && isApproved && (
                <li>No additional search needed — approved as-is</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── RefinementStep ────────────────────────────────────────────── */
function RefinementStep({ loops, isDone, isActive, isFolded }) {
  const approvedLoop = loops.find(l => l.verdict === 'approved')
  const reviseCount  = loops.filter(l => l.verdict === 'revise').length

  const chips = [
    { text: `×${loops.length} iteration${loops.length !== 1 ? 's' : ''}`, variant: 'violet' },
    ...(approvedLoop ? [{ text: 'Approved', variant: 'teal' }] : []),
  ]

  const flatSteps = []
  loops.forEach(loop => {
    flatSteps.push({ label: 'Reviewing draft',  loop: loop.number })
    if (loop.didSearch)  flatSteps.push({ label: 'Searching the web', loop: loop.number })
    if (loop.didRedraft) flatSteps.push({ label: 'Drafting report',   loop: loop.number })
  })

  return (
    <StepItem
      label="Refinement"
      chips={chips}
      isDone={isDone}
      isActive={isActive}
      defaultOpen={loops.length > 0}
    >
      <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-dim)' }}>
        {reviseCount > 0
          ? `${reviseCount} revision${reviseCount !== 1 ? 's' : ''} requested before approval.`
          : 'Approved on first review.'}
      </span>

      {isFolded ? (
        <div className="loop-wrap">
          {loops.map((loop) => (
            <LoopItem
              key={loop.number}
              loop={loop}
              defaultOpen={loop.verdict === 'approved'}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="legacy-note">
            Legacy view — every step from every loop, always expanded.
          </div>
          {flatSteps.map((s, i) => (
            <div key={i} className="legacy-card">
              <span>{s.label}</span>
              <span className="legacy-loop-tag">Loop {s.loop}</span>
            </div>
          ))}
        </>
      )}
    </StepItem>
  )
}

/* ── Main ProgressTimeline ─────────────────────────────────────── */
export default function ProgressTimeline({ steps, phase, engine }) {
  const [isFolded, setIsFolded] = useState(true)

  if (steps.length === 0 && phase !== 'streaming') return null

  const isDone   = phase === 'done'
  const isStream = phase === 'streaming'
  const lastNode = steps[steps.length - 1]?.node

  // Detect if this is a CrewAI run
  const isCrew = engine === 'crewai' || steps.some(
    (s) => (s.node && s.node.startsWith('crew_')) || s.payload?.agent || (typeof s.node === 'string' && s.node.toLowerCase().includes('agent'))
  )

  // ── 1. CrewAI 4-Agent Collaborative Timeline ──────────────────────
  if (isCrew) {
    const methodologistStep = steps.find((s) => s.node === 'crew_methodologist' || s.node === 'plan_steps' || s.payload?.agent?.includes('Methodologist'))
    const scoutStep         = steps.find((s) => s.node === 'crew_scout' || s.node === 'search_web' || s.payload?.agent?.includes('Scout'))
    const synthesizerStep   = steps.find((s) => s.node === 'crew_synthesizer' || s.node === 'draft_report' || s.payload?.agent?.includes('Synthesizer'))
    const auditorStep       = steps.find((s) => s.node === 'crew_auditor' || s.node === 'review_draft' || s.payload?.agent?.includes('Auditor'))

    return (
      <div className="card">
        <div className="timeline-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 className="timeline-title" style={{ margin: 0 }}>Live progress</h3>
            <span
              className="chip"
              style={{
                color: 'var(--violet)',
                backgroundColor: 'rgba(124, 106, 240, 0.12)',
                border: '1px solid rgba(124, 106, 240, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <Users size={11} strokeWidth={2.2} /> CrewAI (4 Agents)
            </span>
          </div>
        </div>

        <ol className="timeline-list">
          {/* Agent 1 — Methodologist */}
          <StepItem
            label="Lead Research Methodologist"
            icon={Microscope}
            chips={[{ text: 'Research Strategist', variant: 'violet' }]}
            isDone={isDone || !!scoutStep}
            isActive={!isDone && (lastNode === 'crew_methodologist' || (!scoutStep && !synthesizerStep && !auditorStep))}
            defaultOpen={true}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Deconstructing inquiry, detecting command lenses, and establishing hypothesis vectors.
              {methodologistStep?.payload?.thought && (
                <p style={{ fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>
                  "{methodologistStep.payload.thought}"
                </p>
              )}
            </div>
          </StepItem>

          {/* Agent 2 — Web Intelligence Scout */}
          <StepItem
            label="Web Intelligence Scout"
            icon={Search}
            chips={[{ text: 'Literature & Evidence Scout', variant: 'blue' }]}
            isDone={isDone || !!synthesizerStep}
            isActive={!isDone && (lastNode === 'crew_scout' || (!!scoutStep && !synthesizerStep))}
            defaultOpen={true}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Executing 5-pillar live web search, verifying domain authority, and extracting grounded document/URL passages.
              {scoutStep?.payload?.thought && (
                <p style={{ fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>
                  "{scoutStep.payload.thought}"
                </p>
              )}
            </div>
          </StepItem>

          {/* Agent 3 — Principal Synthesizer */}
          <StepItem
            label="Principal Research Synthesizer"
            icon={FileEdit}
            chips={[{ text: 'Technical Author', variant: 'teal' }]}
            isDone={isDone || !!auditorStep}
            isActive={!isDone && (lastNode === 'crew_synthesizer' || (!!synthesizerStep && !auditorStep))}
            defaultOpen={true}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Synthesizing multi-source empirical evidence into structured report with comparative tables, headings, and strict inline citations.
              {synthesizerStep?.payload?.thought && (
                <p style={{ fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>
                  "{synthesizerStep.payload.thought}"
                </p>
              )}
            </div>
          </StepItem>

          {/* Agent 4 — Fact-Checking Auditor */}
          <StepItem
            label="Fact-Checking & Review Auditor"
            icon={ShieldCheck}
            chips={[{ text: 'Peer Review Referee', variant: 'amber' }]}
            isDone={isDone}
            isActive={!isDone && (lastNode === 'crew_auditor' || !!auditorStep)}
            defaultOpen={true}
          >
            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Auditing empirical statements against evidence, tagging confidence levels ([Confidence: High/Medium/Low]), and generating follow-up research directions.
              {auditorStep?.payload?.thought && (
                <p style={{ fontStyle: 'italic', color: 'var(--text)', marginTop: 4 }}>
                  "{auditorStep.payload.thought}"
                </p>
              )}
            </div>
          </StepItem>

          {/* Streaming indicator */}
          {isStream && !isDone && (
            <li className="step step-active">
              <div className="step-gutter"><span className="step-node" /></div>
              <div className="step-body" style={{ color: 'var(--text-faint)', fontSize: 13, paddingTop: 4 }}>
                CrewAI agents collaborating on analytical sub-steps…
              </div>
            </li>
          )}
        </ol>
      </div>
    )
  }

  // ── 2. LangGraph State Machine Timeline ───────────────────────────
  const { planStep, initialSearch, initialDraft, loops, finalizeStep } = buildTimeline(steps)

  return (
    <div className="card">
      <div className="timeline-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 className="timeline-title" style={{ margin: 0 }}>Live progress</h3>
          <span
            className="chip"
            style={{
              color: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Zap size={11} strokeWidth={2.2} /> LangGraph Engine
          </span>
        </div>

        {loops.length > 0 && (
          <div className="switch-row">
            <span className="switch-label">Fold repeated steps</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isFolded}
                onChange={e => setIsFolded(e.target.checked)}
              />
              <span className="switch-track" />
              <span className="switch-knob" />
            </label>
          </div>
        )}
      </div>

      <ol className="timeline-list">
        {/* 1 — Planning */}
        {planStep && (
          <StepItem
            label="Planning sub-questions"
            chips={
              planStep.payload?.steps
                ? [{ text: `${planStep.payload.steps.length} sub-questions` }]
                : []
            }
            isDone={isDone || !!initialSearch}
            isActive={!isDone && lastNode === 'plan_steps'}
          >
            {planStep.payload?.steps?.length > 0 && (
              <>
                Split into {planStep.payload.steps.length} lines of inquiry:
                <ul>
                  {planStep.payload.steps.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </>
            )}
          </StepItem>
        )}

        {/* 2 — Initial search */}
        {initialSearch && (
          <StepItem
            label="Searching the web"
            chips={[]}
            isDone={isDone || !!initialDraft}
            isActive={!isDone && lastNode === 'search_web' && loops.length === 0}
          >
            Retrieved sources across the research sub-questions.
          </StepItem>
        )}

        {/* 3 — Initial draft */}
        {initialDraft && (
          <StepItem
            label="Drafting report"
            chips={[]}
            isDone={isDone || loops.length > 0}
            isActive={!isDone && lastNode === 'draft_report' && loops.length === 0}
          >
            First draft written from the collected sources.
          </StepItem>
        )}

        {/* 4 — Refinement (grouped) */}
        {(loops.length > 0 || (!isDone && isStream && lastNode === 'review_draft')) && (
          <RefinementStep
            loops={loops}
            isDone={isDone || !!finalizeStep}
            isActive={isStream && (lastNode === 'review_draft' || (lastNode === 'search_web' && loops.length > 0) || (lastNode === 'draft_report' && loops.length > 0))}
            isFolded={isFolded}
          />
        )}

        {/* 5 — Finalising */}
        {finalizeStep && (
          <StepItem
            label="Finalising report"
            chips={[]}
            isDone={isDone}
            isActive={!isDone && lastNode === 'finalize_report'}
          >
            Formatting applied, citations checked, report marked ready.
          </StepItem>
        )}

        {/* Streaming indicator */}
        {isStream && !finalizeStep && (
          <li className="step step-active">
            <div className="step-gutter"><span className="step-node" /></div>
            <div className="step-body" style={{ color: 'var(--text-faint)', fontSize: 13, paddingTop: 4 }}>
              Waiting for next step…
            </div>
          </li>
        )}
      </ol>
    </div>
  )
}

