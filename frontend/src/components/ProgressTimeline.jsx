import { useState } from 'react'

/* ── Helpers ──────────────────────────────────────────────────── */

/**
 * Convert raw SSE step events into a structured timeline.
 * Returns: { planStep, initialSearch, initialDraft, loops, finalizeStep }
 * where loops = list of { number, verdict, notes, didSearch, didRedraft }
 */
function buildTimeline(steps) {
  const planStep      = steps.find(s => s.node === 'plan_steps')
  const initialSearch = steps.find(s => s.node === 'search_web'   && (s.loop === 0 || s.loop == null))
  const initialDraft  = steps.find(s => s.node === 'draft_report' && (s.loop === 0 || s.loop == null))
  const finalizeStep  = steps.find(s => s.node === 'finalize_report')

  // All review_draft events — each is the end of one loop
  const reviews = steps.filter(s => s.node === 'review_draft')

  const loops = reviews.map((review, idx) => {
    const reviewPos  = steps.indexOf(review)
    const nextReview = reviews[idx + 1]
    const endPos     = nextReview ? steps.indexOf(nextReview) : steps.length

    // Steps that came after this review (before the next review or end)
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
function StepItem({ label, chips = [], children, isDone, isActive, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <li className={`step${isDone ? ' step-done' : isActive ? ' step-active' : ''}`}>
      <div className="step-gutter">
        <span className="step-node" />
      </div>
      <div className="step-body animate-in">
        <button className="step-toggle" onClick={() => setOpen(o => !o)}>
          <span className="step-toggle-label">{label}</span>
          {chips.length > 0 && (
            <span className="step-toggle-chips">
              {chips.map((c, i) => (
                <span key={i} className={`chip${c.variant ? ` chip-${c.variant}` : ''}`}>
                  {c.text}
                </span>
              ))}
            </span>
          )}
          <span className={`step-chevron${open ? ' open' : ''}`}>⌄</span>
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
          {isApproved ? 'Approved' : 'Needs revision'}
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

  // Flat / legacy steps for the toggle
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
        /* Folded view — loop accordion */
        <div className="loop-wrap">
          {loops.map((loop, i) => (
            <LoopItem
              key={loop.number}
              loop={loop}
              defaultOpen={loop.verdict === 'approved'}
            />
          ))}
        </div>
      ) : (
        /* Legacy flat view */
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
export default function ProgressTimeline({ steps, phase }) {
  const [isFolded, setIsFolded] = useState(true)

  if (steps.length === 0 && phase !== 'streaming') return null

  const { planStep, initialSearch, initialDraft, loops, finalizeStep } = buildTimeline(steps)

  const isDone   = phase === 'done'
  const isStream = phase === 'streaming'

  // Which node is currently active (last seen)
  const lastNode = steps[steps.length - 1]?.node

  return (
    <div className="card">
      <div className="timeline-header">
        <h3 className="timeline-title">Live progress</h3>

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
