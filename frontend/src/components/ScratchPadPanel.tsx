import { useState, useEffect, useRef, useCallback } from 'react'
import { getScratch, updateScratch } from '../api'

interface Props {
  open: boolean
  onClose: () => void
}

export function ScratchPadPanel({ open, onClose }: Props) {
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      getScratch().then((pad) => {
        setContent(pad.content)
        setLastSaved(new Date(pad.updatedAt))
      }).catch(() => {})
    }
  }, [open])

  const save = useCallback(async (text: string) => {
    try {
      const pad = await updateScratch(text)
      setLastSaved(new Date(pad.updatedAt))
    } catch {}
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(val), 1000)
  }

  if (!open) return null

  const savedTime = lastSaved
    ? lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      padding: '14px 20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: 'var(--text-faint)',
        }}>
          // scratch pad
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {savedTime && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '11px',
              color: 'var(--text-faint)',
            }}>
              Son kaydedildi: {savedTime}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            ×
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Notlarınızı buraya yazın..."
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '10px 12px',
          color: 'var(--text-primary)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          minHeight: '120px',
          resize: 'vertical',
          boxSizing: 'border-box',
          outline: 'none',
          lineHeight: 1.6,
        }}
      />
    </div>
  )
}
