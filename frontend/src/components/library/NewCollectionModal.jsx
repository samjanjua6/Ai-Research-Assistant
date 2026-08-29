import { useState } from 'react'
import { X, Folder, Plus, Check } from 'lucide-react'
import { createCollection } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const COLORS = [
  '#7c6af0', // Violet
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#64748b', // Slate
]

export function NewCollectionModal({ onClose, onCreated }) {
  const { info: toastInfo, error: toastError } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const res = await createCollection({
        name: name.trim(),
        description: description.trim(),
        color,
        icon: 'Folder',
      })
      if (res?.collection) {
        toastInfo(`Collection "${res.collection.name}" created!`, { title: 'Folder Created' })
        onCreated?.(res.collection)
        onClose()
      }
    } catch (err) {
      toastError(err.message || 'Failed to create collection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-overlay animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={18} strokeWidth={2.2} style={{ color }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Create Research Folder
            </h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Folder Name
            </label>
            <input
              type="text"
              className="input-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Solid-State Batteries 2026"
              required
              autoFocus
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Description (Optional)
            </label>
            <input
              type="text"
              className="input-text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electrolyte stability and cost benchmarks"
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
              Accent Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s ease',
                    transform: color === c ? 'scale(1.15)' : 'none',
                  }}
                >
                  {color === c && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
