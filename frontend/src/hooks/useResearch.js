import { useState, useCallback, useRef, useEffect } from 'react'
import { startRun, listRuns, getRun, openStream, stopRun } from '../api/client'
import { toast } from '../context/ToastContext'

/**
 * useResearch — central state hook for the whole app.
 *
 * Exposes:
 *   phase         — 'idle' | 'streaming' | 'done' | 'error'
 *   steps         — array of step-event payloads (live timeline)
 *   report        — { id, summary, final_report, sources } when done
 *   streamingText — live real-time token string as LLM drafts
 *   streamingNode — active generating node name (e.g. 'draft_report')
 *   streamingLoop — current loop iteration index
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
  const [phase,         setPhase]         = useState('idle')
  const [steps,         setSteps]         = useState([])
  const [report,        setReport]        = useState(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingNode, setStreamingNode] = useState(null)
  const [streamingLoop, setStreamingLoop] = useState(0)
  const [history,       setHistory]       = useState([])
  const [error,         setError]         = useState(null)
  const [activeRunId,   setActiveRunId]   = useState(null)

  // Holds the SSE cleanup function so we can cancel on unmount / new run
  const cleanupRef = useRef(null)
  const activeRunIdRef = useRef(null)

  // 60fps token buffer via requestAnimationFrame
  const tokenBufferRef = useRef('')
  const rafIdRef = useRef(null)

  const flushTokenBuffer = useCallback(() => {
    if (tokenBufferRef.current) {
      const chunk = tokenBufferRef.current
      tokenBufferRef.current = ''
      setStreamingText((prev) => prev + chunk)
    }
    rafIdRef.current = null
  }, [])

  // Close any open stream
  const closeStream = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    tokenBufferRef.current = ''
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
      setStreamingText('')
      setStreamingNode(null)
      setStreamingLoop(0)
      setError(null)
      setPhase('idle')
      setActiveRunId(null)
    }
  }, [currentUser, loadHistory, closeStream])

  // ── _startStream ────────────────────────────────────────────────
  const _startStream = useCallback((runId) => {
    setActiveRunId(runId)
    activeRunIdRef.current = runId
    setStreamingText('')
    setStreamingNode(null)
    setStreamingLoop(0)

    cleanupRef.current = openStream(runId, {
      onStep: (data) => {
        setSteps((prev) => [...prev, data])
      },
      onToken: (data) => {
        if (data.node) setStreamingNode(data.node)
        if (typeof data.loop === 'number') setStreamingLoop(data.loop)
        if (data.token) {
          tokenBufferRef.current += data.token
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(flushTokenBuffer)
          }
        }
      },
      onDone: (data) => {
        cleanupRef.current = null
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        tokenBufferRef.current = ''
        setStreamingText('')
        setStreamingNode(null)

        if (data.status === 'done') {
          setReport({
            id:           runId,
            summary:      data.summary,
            final_report: data.final_report,
            sources:      data.sources || [],
            documents_metadata: data.documents_metadata || [],
            follow_up_questions: data.follow_up_questions || [],
            share_token:  data.share_token,
            is_public:    data.is_public,
            views_count:  data.views_count,
          })
          setPhase('done')
          toast.success('Research report synthesized successfully!', { title: 'Completed' })
        } else {
          const errText = data.error || 'Research run failed — check server logs.'
          setError(errText)
          setPhase('error')
          toast.error(errText, { title: 'Research Failed' })
        }
        loadHistory()
      },
      onError: (err) => {
        setError(err.message)
        setPhase('error')
        toast.error(err.message || 'Stream disconnected', { title: 'Connection Error' })
        loadHistory()
      },
    })
  }, [loadHistory, flushTokenBuffer])

  // ── submit ───────────────────────────────────────────────────────
  const submit = useCallback(async (questionOrPayload) => {
    closeStream()
    setSteps([])
    setReport(null)
    setStreamingText('')
    setStreamingNode(null)
    setStreamingLoop(0)
    setError(null)
    setPhase('streaming')
    toast.info('Research started — formulating plan…', { title: 'Run Started' })

    try {
      const { run_id } = await startRun(questionOrPayload)
      setActiveRunId(run_id)
      activeRunIdRef.current = run_id
      await loadHistory()
      _startStream(run_id)
      return run_id
    } catch (err) {
      setError(err.message)
      setPhase('error')
      toast.error(err.message || 'Failed to start research run', { title: 'Request Failed' })
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
    toast.warning('Research process stopped.', { title: 'Process Stopped' })
    loadHistory()
  }, [closeStream, loadHistory])

  // ── viewRun ──────────────────────────────────────────────────────
  const viewRun = useCallback(async (runId) => {
    closeStream()
    setSteps([])
    setReport(null)
    setStreamingText('')
    setStreamingNode(null)
    setStreamingLoop(0)
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
          documents_metadata: run.documents_metadata || [],
          follow_up_questions: run.follow_up_questions || [],
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
    streamingText,
    streamingNode,
    streamingLoop,
    history,
    error,
    activeRunId,
    submit,
    stop,
    viewRun,
    loadHistory,
  }
}
