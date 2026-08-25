import { useState, useCallback, useRef, useEffect } from 'react'
import { startRun, listRuns, getRun, openStream, stopRun } from '../api/client'

/**
 * useResearch — central state hook for the whole app.
 *
 * Exposes:
 *   phase         — 'idle' | 'streaming' | 'done' | 'error'
 *   steps         — array of step-event payloads (live timeline)
 *   report        — { summary, final_report, sources } when done
 *   history       — list of past runs
 *   error         — error message string or null
 *   activeRunId   — currently active/viewed run ID
 *   submit(question)  — start a new run
 *   stop()            — cancel the current running research
 *   viewRun(runId)    — load/re-stream a past run
 *   loadHistory()     — refresh history list
 *
 * @param {{ id: string } | null} currentUser — pass the auth user so history
 *   reloads when they log in/out.
 */
export function useResearch(currentUser = null) {
  const [phase,       setPhase]       = useState('idle')
  const [steps,       setSteps]       = useState([])
  const [report,      setReport]      = useState(null)
  const [history,     setHistory]     = useState([])
  const [error,       setError]       = useState(null)
  const [activeRunId, setActiveRunId] = useState(null)

  // Holds the SSE cleanup function so we can cancel on unmount / new run
  const cleanupRef = useRef(null)
  const activeRunIdRef = useRef(null)

  // Close any open stream
  const closeStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => closeStream(), [closeStream])

  // ── loadHistory ─────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const runs = await listRuns()
      setHistory(runs)
    } catch {
      // silently ignore — server may not be ready yet or user is logged out
    }
  }, [])

  // Reload history whenever the logged-in user changes (login / logout)
  useEffect(() => {
    if (currentUser) {
      loadHistory()
    } else {
      // Logged out — clear everything
      closeStream()
      setHistory([])
      setSteps([])
      setReport(null)
      setError(null)
      setPhase('idle')
      setActiveRunId(null)
    }
  }, [currentUser, loadHistory, closeStream])

  // ── _startStream ────────────────────────────────────────────────
  const _startStream = useCallback((runId) => {
    setActiveRunId(runId)
    activeRunIdRef.current = runId

    cleanupRef.current = openStream(runId, {
      onStep: (data) => {
        setSteps((prev) => [...prev, data])
      },
      onDone: (data) => {
        cleanupRef.current = null
        if (data.status === 'done') {
          setReport({
            id:           runId,
            summary:      data.summary,
            final_report: data.final_report,
            sources:      data.sources || [],
          })
          setPhase('done')
        } else {
          setError(data.error || 'Research run failed — check server logs.')
          setPhase('error')
        }
        loadHistory()
      },
      onError: (err) => {
        setError(err.message)
        setPhase('error')
        loadHistory()
      },
    })
  }, [loadHistory])

  // ── submit ───────────────────────────────────────────────────────
  const submit = useCallback(async (question) => {
    closeStream()
    setSteps([])
    setReport(null)
    setError(null)
    setPhase('streaming')

    try {
      const { run_id } = await startRun(question)
      setActiveRunId(run_id)
      activeRunIdRef.current = run_id
      await loadHistory()
      _startStream(run_id)
      return run_id
    } catch (err) {
      setError(err.message)
      setPhase('error')
      return null
    }
  }, [closeStream, loadHistory, _startStream])

  // ── stop ─────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    const currentRunId = activeRunIdRef.current
    closeStream()
    if (currentRunId) {
      try {
        await stopRun(currentRunId)
      } catch (err) {
        console.warn('Failed to stop run on backend:', err)
      }
    }
    setError('Research stopped by user.')
    setPhase('error')
    loadHistory()
  }, [closeStream, loadHistory])

  // ── viewRun ──────────────────────────────────────────────────────
  const viewRun = useCallback(async (runId) => {
    closeStream()
    setSteps([])
    setReport(null)
    setError(null)
    setActiveRunId(runId)
    activeRunIdRef.current = runId

    try {
      const run = await getRun(runId)

      if (run.steps && run.steps.length > 0) {
        setSteps(run.steps)
      }

      if (run.status === 'done') {
        setReport({
          id:           run.id || runId,
          summary:      run.summary,
          final_report: run.final_report,
          sources:      run.sources || [],
          share_token:  run.share_token,
          is_public:    run.is_public,
          views_count:  run.views_count,
        })
        setPhase('done')
      } else if (run.status === 'running') {
        setPhase('streaming')
        _startStream(runId)
      } else if (run.status === 'failed') {
        setError(run.error || 'This run failed.')
        setPhase('error')
      } else {
        setPhase('idle')
      }
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
  }, [closeStream, _startStream])

  return {
    phase,
    steps,
    report,
    history,
    error,
    activeRunId,
    submit,
    stop,
    viewRun,
    loadHistory,
  }
}
