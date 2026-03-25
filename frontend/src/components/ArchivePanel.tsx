import { ArchivedTask } from '../types'

interface Props {
  tasks: ArchivedTask[]
  open: boolean
}

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  DEV:    { bg: 'var(--tag-dev-bg)',    fg: 'var(--tag-dev-fg)' },
  BUG:    { bg: 'var(--tag-bug-bg)',    fg: 'var(--tag-bug-fg)' },
  TEST:   { bg: 'var(--tag-test-bg)',   fg: 'var(--tag-test-fg)' },
  DOC:    { bg: 'var(--tag-doc-bg)',    fg: 'var(--tag-doc-fg)' },
  DESIGN: { bg: 'var(--tag-design-bg)', fg: 'var(--tag-design-fg)' },
  OPS:    { bg: 'var(--tag-ops-bg)',    fg: 'var(--tag-ops-fg)' },
}

export function ArchivePanel({ tasks, open }: Props) {
  if (!open) return null

  // Group by weekNumber, sort weeks descending
  const grouped = tasks.reduce<Record<number, ArchivedTask[]>>((acc, t) => {
    if (!acc[t.weekNumber]) acc[t.weekNumber] = []
    acc[t.weekNumber].push(t)
    return acc
  }, {})
  const weeks = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '20px',
      background: 'var(--bg-surface)',
    }}>
      <h3 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        marginBottom: '16px',
        fontFamily: "'IBM Plex Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Arşiv
      </h3>

      {tasks.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Henüz arşiv kaydı yok.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {weeks.map((week) => (
          <div key={week}>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-faint)',
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: '8px',
            }}>
              Hafta {week}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {grouped[week].map((task) => {
                const tagStyle = TAG_STYLES[task.tag] || TAG_STYLES.DEV
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{
                      flex: 1,
                      fontSize: '13px',
                      color: 'var(--text-faint)',
                      textDecoration: 'line-through',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      background: tagStyle.bg,
                      color: tagStyle.fg,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      flexShrink: 0,
                    }}>
                      {task.tag}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-faint)',
                      fontFamily: "'IBM Plex Mono', monospace",
                      flexShrink: 0,
                    }}>
                      {task.archiveReason === 'AUTO' ? 'oto' : 'hafta'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
