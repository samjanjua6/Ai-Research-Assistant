import React from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div
          className="card animate-in"
          style={{
            maxWidth: 600,
            margin: '60px auto',
            padding: '36px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: '#f43f5e',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={26} strokeWidth={2.2} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Unable to Display Research View
          </h2>

          <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 20 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred while displaying the research report.'}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: '13px' }}
            >
              <RotateCcw size={14} strokeWidth={2} />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
