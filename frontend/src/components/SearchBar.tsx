import { useState, useEffect, useRef } from 'react'
import { Task } from '../types'
import { searchTasks } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  onTaskClick: (task: Task) => void
}

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  DEV:    { bg: 'var(--tag-dev-bg)',    fg: 'var(--tag-dev-fg)' },
  BUG:    { bg: 'var(--tag-bug-bg)',    fg: 'var(--tag-bug-fg)' },
  TEST:   { bg: 'var(--tag-test-bg)',   fg: 'var(--tag-test-fg)' },
  DOC:    { bg: 'var(--tag-doc-bg)',    fg: 'var(--tag-doc-fg)' },
  DESIGN: { bg: 'var(--tag-design-bg)', fg: 'var(--tag-design-fg)' },
  OPS:    { bg: 'var(--tag-ops-bg)',    fg: 'var(--tag-ops-fg)' },
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'TODO',
  IN_PROGRESS: 'PROG',
  DONE: 'DONE',
}

export function SearchBar({ open, onClose, onTaskClick }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Task[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchTasks(query)
        setResults(res.slice(0, 8))
      } catch {}
    }, 300)
  }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          width: '520px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '10px' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '14px',
            color: 'var(--text-faint)',
            flexShrink: 0,
          }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Görev ara..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
        </div>

        {query.trim() && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {results.length === 0 ? (
              <div style={{
                padding: '16px',
                fontSize: '13px',
                color: 'var(--text-faint)',
                textAlign: 'center',
              }}>
                Sonuç bulunamadı
              </div>
            ) : (
              results.map((task) => {
                const tagStyle = TAG_STYLES[task.tag] ?? TAG_STYLES.DEV
                return (
                  <div
                    key={task.id}
                    onClick={() => { onTaskClick(task); onClose() }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 16px',
                      gap: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                    }}
                  >
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {task.title}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      background: tagStyle.bg,
                      color: tagStyle.fg,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      flexShrink: 0,
                    }}>
                      {task.tag}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--text-faint)',
                      flexShrink: 0,
                    }}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
